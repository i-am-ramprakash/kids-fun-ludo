import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, getDoc, updateDoc, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyD6KWcd1rZBlXfmdy8QZskUXLiXhUMwc90",
  authDomain: "space-ludo.firebaseapp.com",
  projectId: "space-ludo",
  storageBucket: "space-ludo.firebasestorage.app",
  messagingSenderId: "164262640583",
  appId: "1:164262640583:web:e465f0fd820cb73ef0b7e2",
  measurementId: "G-FJQ4K4TLHT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.Multiplayer = {
    app, db, auth,
    isOnline: false,
    roomId: null,
    userId: null,
    mySlotIdx: 0, // Which player slot this client controls
    roomDocUnsubscribe: null,
    lastProcessedTimestamp: 0,

    init: async function() {
        if (auth.currentUser) {
            this.userId = auth.currentUser.uid;
            return auth.currentUser;
        }
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                if (user) {
                    this.userId = user.uid;
                    console.log("Firebase Auth Connected: " + this.userId);
                    resolve(user);
                } else {
                    signInAnonymously(auth).then((cred) => {
                        this.userId = cred.user.uid;
                        resolve(cred.user);
                    }).catch(err => {
                        console.error("Auth error:", err);
                        reject(err);
                    });
                }
            });
        });
    },

    signUp: async function(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    },

    signIn: async function(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    },

    saveProfileToFirestore: async function(uid, profileData) {
        const userRef = doc(db, "users", uid);
        return setDoc(userRef, profileData, { merge: true });
    },

    getProfileFromFirestore: async function(uid) {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        return snap.exists() ? snap.data() : null;
    },

    generateRoomId: function() {
        return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    },

    createRoom: async function(isPublic = false) {
        await this.init();
        this.roomId = this.generateRoomId();
        this.mySlotIdx = 0; // Host is Player 0
        this.isOnline = true;

        const roomRef = doc(db, "rooms", this.roomId);
        await setDoc(roomRef, {
            host: this.userId,
            players: { 0: this.userId }, // Map slots to UIDs
            createdAt: Date.now(),
            gameState: null,
            lastAction: null,
            emote: null,
            isPublic: isPublic === true,
            status: "waiting"
        });

        this.startListening();
        return this.roomId;
    },

    quickMatch: async function() {
        await this.init();
        const roomsRef = collection(db, "rooms");
        const q = query(roomsRef, where("isPublic", "==", true), where("status", "==", "waiting"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            // Join existing public room
            const roomDoc = querySnapshot.docs[0];
            return await this.joinRoom(roomDoc.id);
        } else {
            // Create new public room
            await this.createRoom(true);
            return { slot: 0, roomId: this.roomId }; // We are host
        }
    },

    joinRoom: async function(roomId) {
        await this.init();
        const roomRef = doc(db, "rooms", roomId);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            throw new Error("Room not found");
        }

        const data = roomSnap.data();
        const players = data.players || {};
        
        // Find next available slot (1, 2, or 3)
        let slot = -1;
        for (let i = 1; i <= 3; i++) {
            if (!players[i]) {
                slot = i;
                break;
            }
        }

        if (slot === -1) {
            throw new Error("Room is full");
        }

        players[slot] = this.userId;
        let status = data.status || "waiting";
        if (Object.keys(players).length >= 4) {
            status = "playing"; // Mark full
        }

        await updateDoc(roomRef, { players, status });

        this.roomId = roomId;
        this.mySlotIdx = slot;
        this.isOnline = true;

        this.startListening();
        return { slot, roomId };
    },

    startListening: function() {
        if (this.roomDocUnsubscribe) {
            this.roomDocUnsubscribe();
        }

        const roomRef = doc(db, "rooms", this.roomId);
        this.roomDocUnsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();

            // Handle incoming Actions
            if (data.lastAction && data.lastAction.timestamp > this.lastProcessedTimestamp) {
                if (data.lastAction.sender !== this.userId) {
                    this.processIncomingAction(data.lastAction);
                }
                this.lastProcessedTimestamp = data.lastAction.timestamp;
            }

            // Sync players for UI (e.g., connected indicators)
            if (data.players) {
                window.onlinePlayersMap = data.players;
                // Dispatch event so UI can update player names/status
                const evt = new CustomEvent('multiplayer-players-updated', { detail: data.players });
                window.dispatchEvent(evt);
            }

            // Handle emotes
            if (data.emote && data.emote.timestamp > (this.lastEmoteTimestamp || 0)) {
                this.lastEmoteTimestamp = data.emote.timestamp;
                if (data.emote.sender !== this.userId && typeof showHolographicEmote === 'function') {
                    showHolographicEmote(data.emote.slotIdx, data.emote.emoji);
                }
            }
        });
    },

    broadcastAction: async function(actionType, payload = {}) {
        if (!this.isOnline || !this.roomId) return;
        const roomRef = doc(db, "rooms", this.roomId);
        await updateDoc(roomRef, {
            lastAction: {
                type: actionType,
                payload: payload,
                sender: this.userId,
                timestamp: Date.now()
            }
        });
    },

    broadcastFullState: async function() {
        if (!this.isOnline || !this.roomId) return;
        const roomRef = doc(db, "rooms", this.roomId);
        // Stringify to avoid complex nested Firebase serialization errors with game state
        await updateDoc(roomRef, {
            gameState: JSON.stringify(state)
        });
    },

    sendEmote: async function(emoji) {
        if (!this.isOnline || !this.roomId) return;
        const roomRef = doc(db, "rooms", this.roomId);
        await updateDoc(roomRef, {
            emote: {
                emoji: emoji,
                slotIdx: this.mySlotIdx,
                sender: this.userId,
                timestamp: Date.now()
            }
        });
    },

    processIncomingAction: function(action) {
        // Map network events to local game functions
        const { type, payload } = action;
        console.log("Multiplayer Incoming Action:", type, payload);

        if (type === 'ROLL_DICE') {
            // Overwrite the next local roll to match payload, then trigger roll
            const pIdx = payload.playerIdx;
            // Hack to force the specific roll value:
            window.__forceNextRollValue = payload.roll; 
            if (typeof rollPlayerDice === 'function') rollPlayerDice(pIdx);
        }
        else if (type === 'MOVE_PAWN') {
            const { playerIdx, pawnIdx, steps } = payload;
            if (typeof executePawnMoveAnimation === 'function') {
                executePawnMoveAnimation(playerIdx, pawnIdx, steps, true);
            }
        }
        else if (type === 'ACTIVATE_POWERUP') {
            const { playerIdx, slotIdx, targetPawn } = payload;
            if (typeof gamePowerUpEngine !== 'undefined') {
                // If targeting
                if (targetPawn !== undefined && targetPawn !== null) {
                    state.activePowerUpTarget = { key: state.playerPowerups[playerIdx][slotIdx], slotIdx: slotIdx };
                    gamePowerUpEngine.resolveTargetedPowerUp(targetPawn, true);
                } else {
                    gamePowerUpEngine.activatePowerUp(playerIdx, slotIdx, true);
                }
            }
        }
        else if (type === 'GAME_START') {
            // Host started game
            if (payload.config) {
                state.gameConfig = payload.config;
            }
            state.isMultiplayer = true;
            if (typeof triggerNewGame === 'function') {
                triggerNewGame();
            }
        }
        else if (type === 'SL_GAME_START') {
            if (typeof startSLGameFromNetwork === 'function') {
                startSLGameFromNetwork(payload.config);
            }
        }
        else if (type === 'SL_ROLL_DICE') {
            if (typeof networkSLRollDice === 'function') {
                networkSLRollDice(payload.playerIdx, payload.roll);
            }
        }
        else if (type === 'SL_MOVE_PAWN') {
            if (typeof executeSLMovement === 'function') {
                executeSLMovement(payload.playerIdx, payload.steps, true);
            }
        }
    }
};
