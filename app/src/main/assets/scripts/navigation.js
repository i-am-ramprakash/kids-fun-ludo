// navigation.js - Core routing, persistent bottom tabs, and local data persistence

// navigation.js - Core routing, persistent bottom tabs, and local data persistence

// Active view state
let currentScreen = 'splash';
let activeTab = 'home';

// persistent isClashMode property to avoid going stale mid-game
Object.defineProperty(window, 'isClashMode', {
    get() {
        return localStorage.getItem('cosmic_is_clash_mode') === 'true';
    },
    set(value) {
        localStorage.setItem('cosmic_is_clash_mode', value ? 'true' : 'false');
    }
});

// Default Leaderboard records with games and wins
const DEFAULT_LEADERBOARD = [
    { rank: 1, name: "Vader Operative", winRate: "89%", rankPoints: 4850, species: "Cyborg", gamesPlayed: 100, totalWins: 89 },
    { rank: 2, name: "Spock", winRate: "78%", rankPoints: 4120, species: "Vulcan", gamesPlayed: 80, totalWins: 62 },
    { rank: 3, name: "Baby Yoda", winRate: "72%", rankPoints: 3910, species: "Unknown", gamesPlayed: 50, totalWins: 36 },
    { rank: 4, name: "Star-Lord", winRate: "61%", rankPoints: 2890, species: "Terran", gamesPlayed: 40, totalWins: 24 },
    { rank: 5, name: "Artoo AI", winRate: "54%", rankPoints: 2150, species: "Android", gamesPlayed: 30, totalWins: 16 }
];

// In-memory leaderboard records
let leaderboardRecords = [];

// Default profile definition (DRY approach)
const DEFAULT_PROFILE = {
    commanderName: "",
    species: "Terran (Human)",
    gamesPlayed: 0,
    totalWins: 0,
    unlockedBadges: ["First Flight"],
    isRegistered: false,
    stars: 1000,
    lastDailyLogin: 0,
    unlockedSkins: ["classic"],
    equippedSkin: "classic"
};

// Species to custom headshot portrait mappings
const SPECIES_AVATARS = {
    "Terran (Human)": "images/generated/avatars/avatar_terran.png",
    "Martian Invader": "images/generated/avatars/avatar_martian.png",
    "Andromedan Android": "images/generated/avatars/avatar_android.png",
    "Neptunian Explorer": "images/generated/avatars/avatar_neptunian.png",
    "Gromflomite Bounty Hunter": "images/generated/avatars/avatar_gromflomite.png",
    "Proxima Centaurian Elf": "images/generated/avatars/avatar_proxima_elf.png"
};

// Available custom UFO token skins
const UFO_SKINS = [
    { id: "classic", name: "Classic Saucer", emoji: "🛸", cost: 0, desc: "Standard pilot issue saucer token." },
    { id: "cruiser", name: "Star Cruiser", emoji: "🚀", cost: 150, desc: "High-velocity cruiser built for tactical maneuvers." },
    { id: "vortex", name: "Vortex Sphere", emoji: "🔮", cost: 300, desc: "Anomalous portal projector pulling cosmic gravity." },
    { id: "quantum", name: "Quantum Probe", emoji: "🛰️", cost: 500, desc: "Equipped with hyper-sensitive sensors for deep space paths." },
    { id: "phoenix", name: "Phoenix Rocket", emoji: "☄️", cost: 800, desc: "Harnessing the heat of passing solar flares." },
    { id: "hyperdrive", name: "Hyperdrive Saucer", emoji: "⚡", cost: 1200, desc: "Prototype electro-charged saucer sparking cosmic electricity." },
    { id: "nebula", name: "Nebula Eclipse", emoji: "🪐", cost: 2000, desc: "Prestige token carved from dense ring system asteroids." },
    // 7 Expansion Skins:
    { id: "dragon", name: "Dragon Cruiser", emoji: "🐲", cost: 500, desc: "Fierce predator vessel armored with solar scales." },
    { id: "stealth", name: "Stealth Void", emoji: "🛸", cost: 800, desc: "Radar-absorbent plating for silent covert flight paths." },
    { id: "crystal", name: "Crystal Prism", emoji: "💎", cost: 1000, desc: "Refracts ambient starlight into glowing forcefields." },
    { id: "mech", name: "Mech Saucer", emoji: "🤖", cost: 1500, desc: "Hydraulically reinforced defense saucer built to ram." },
    { id: "pumpkin", name: "Jack-o-Lantern", emoji: "🎃", cost: 300, desc: "Spooky seasonal probe with eerie glowing plasma core." },
    { id: "candy", name: "Candy Ship", emoji: "🍬", cost: 300, desc: "Sweet dessert-styled saucer coated in hyper-sugar fuel." },
    { id: "dino", name: "Dino Fighter", emoji: "🦖", cost: 400, desc: "Jurassic-class scout vessel with heavy carbon scales." }
];

// Profile data initialized from default
let commanderProfile = { ...DEFAULT_PROFILE };

// All available species in Cosmic Ludo
const ALIEN_SPECIES = [
    "Terran (Human)",
    "Martian Invader",
    "Andromedan Android",
    "Neptunian Explorer",
    "Gromflomite Bounty Hunter",
    "Proxima Centaurian Elf"
];

let selectedLoginSpecies = "Terran (Human)";
let welcomeBackTimeout = null;

// Initialize species avatar picker grid in onboarding
function initLoginAvatarGrid() {
    const grid = document.getElementById('login-avatar-grid');
    if (!grid) return;
    grid.innerHTML = ALIEN_SPECIES.map(spec => {
        const avatarSrc = SPECIES_AVATARS[spec];
        const shortName = spec.split(' ')[0]; // E.g. "Terran", "Martian"
        const isSelected = spec === selectedLoginSpecies ? 'selected' : '';
        const imgHTML = avatarSrc ? `<img src="${avatarSrc}" class="avatar-emoji" style="width: 48px; height: 48px; border-radius: 50%; object-fit: contain;" />` : `<span class="avatar-emoji">${SPECIES_EMOJIS[spec] || "👽"}</span>`;
        return `
            <div class="avatar-card ${isSelected}" onclick="selectLoginSpecies('${spec}')" id="avatar-card-${spec.replace(/\s+/g, '-').replace(/[()]/g, '')}">
                ${imgHTML}
                <span class="avatar-name">${shortName}</span>
            </div>
        `;
    }).join('');
}

window.selectLoginSpecies = function(spec) {
    selectedLoginSpecies = spec;
    document.querySelectorAll('#login-avatar-grid .avatar-card').forEach(card => {
        card.classList.remove('selected');
    });
    const targetCard = document.getElementById(`avatar-card-${spec.replace(/\s+/g, '-').replace(/[()]/g, '')}`);
    if (targetCard) {
        targetCard.classList.add('selected');
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(500, 80, 0.2, 'sine');
    }
};

let isRegistrationMode = true;

window.toggleAuthMode = function() {
    isRegistrationMode = !isRegistrationMode;
    const fields = document.getElementById('login-register-fields');
    const submitBtn = document.getElementById('login-submit-btn');
    const modeToggle = document.getElementById('login-mode-toggle');
    const subtitle = document.querySelector('#login-form-card .login-subtitle');

    if (isRegistrationMode) {
        if (fields) fields.style.display = 'flex';
        if (submitBtn) submitBtn.innerText = '🚀 REGISTER PILOT';
        if (modeToggle) modeToggle.innerText = 'ALREADY A PILOT? SIGN IN';
        if (subtitle) subtitle.innerText = 'PILOT REGISTRATION';
    } else {
        if (fields) fields.style.display = 'none';
        if (submitBtn) submitBtn.innerText = '🚀 SIGN IN PILOT';
        if (modeToggle) modeToggle.innerText = 'NEW PILOT? REGISTER ACCOUNT';
        if (subtitle) subtitle.innerText = 'PILOT SIGN IN';
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 60, 0.25, 'sine');
    }
};

window.submitAuthForm = function() {
    if (isRegistrationMode) {
        registerPilot();
    } else {
        loginPilot();
    }
};

window.registerPilot = async function() {
    const emailInput = document.getElementById('login-email-input');
    const passwordInput = document.getElementById('login-password-input');
    const nameInput = document.getElementById('login-username-input');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const name = nameInput ? nameInput.value.trim().toUpperCase() : '';

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        raiseToast('Please enter a valid email address!', '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
        return;
    }
    if (!password || password.length < 6) {
        raiseToast('Access Code (Password) must be at least 6 characters!', '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
        return;
    }
    if (!name) {
        raiseToast('Please enter a valid call-sign!', '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
        return;
    }

    if (!window.Multiplayer || !window.Multiplayer.signUp) {
        raiseToast('Network subsystem offline!', '⚠️');
        return;
    }

    raiseToast('Transmitting registration protocols...', '📡');

    try {
        const userCredential = await window.Multiplayer.signUp(email, password);
        const user = userCredential.user;
        
        // Save Firestore profile data
        const profileData = {
            name: name,
            species: selectedLoginSpecies,
            email: email,
            gamesPlayed: 0,
            totalWins: 0,
            unlockedBadges: ["First Flight"],
            stars: 1000,
            lastDailyLogin: 0
        };
        await window.Multiplayer.saveProfileToFirestore(user.uid, profileData);

        // Update local profile representation
        commanderProfile.commanderName = name;
        commanderProfile.species = selectedLoginSpecies;
        commanderProfile.gamesPlayed = 0;
        commanderProfile.totalWins = 0;
        commanderProfile.unlockedBadges = ["First Flight"];
        commanderProfile.stars = 1000;
        commanderProfile.lastDailyLogin = 0;
        commanderProfile.isRegistered = true;
        saveProfile();

        // Dispatch Welcome Email
        sendWelcomeEmail(email, name);

        syncHeaderAndPilotData();

        if (typeof playSynthSound === 'function') {
            playSynthSound(500, 1000, 0.5, 'sine');
        }

        raiseToast(`Pilot registered! Welcome aboard, Commander ${name}!`, '🚀');
        navigateTo('home-screen');
        if (typeof checkDailyLogin === 'function') {
            checkDailyLogin();
        }

    } catch (error) {
        console.error("Sign up error:", error);
        let errMsg = "Registration failed! check credentials.";
        if (error.code === 'auth/email-already-in-use') {
            errMsg = "Call-sign email is already in use!";
        } else if (error.code === 'auth/invalid-email') {
            errMsg = "Invalid email format entered!";
        } else if (error.code === 'auth/weak-password') {
            errMsg = "Password key is too weak!";
        }
        raiseToast(errMsg, '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
    }
};

window.loginPilot = async function() {
    const emailInput = document.getElementById('login-email-input');
    const passwordInput = document.getElementById('login-password-input');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email) {
        raiseToast('Please enter your email call-sign!', '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
        return;
    }
    if (!password) {
        raiseToast('Please enter your password key!', '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
        return;
    }

    if (!window.Multiplayer || !window.Multiplayer.signIn) {
        raiseToast('Network subsystem offline!', '⚠️');
        return;
    }

    raiseToast('Verifying security clearance...', '📡');

    try {
        const userCredential = await window.Multiplayer.signIn(email, password);
        const user = userCredential.user;

        // Fetch Firestore profile data
        const profileData = await window.Multiplayer.getProfileFromFirestore(user.uid);
        if (profileData) {
            commanderProfile.commanderName = profileData.name || "COSMIC CADET";
            commanderProfile.species = profileData.species || "Terran (Human)";
            commanderProfile.gamesPlayed = profileData.gamesPlayed || 0;
            commanderProfile.totalWins = profileData.totalWins || 0;
            commanderProfile.unlockedBadges = profileData.unlockedBadges || ["First Flight"];
            commanderProfile.stars = profileData.stars !== undefined ? profileData.stars : 1000;
            commanderProfile.lastDailyLogin = profileData.lastDailyLogin || Date.now();
        } else {
            // Default mapping fallback
            commanderProfile.commanderName = "COSMIC CADET";
            commanderProfile.species = "Terran (Human)";
            commanderProfile.gamesPlayed = 0;
            commanderProfile.totalWins = 0;
            commanderProfile.unlockedBadges = ["First Flight"];
            commanderProfile.stars = 1000;
            commanderProfile.lastDailyLogin = Date.now();
        }
        commanderProfile.isRegistered = true;
        saveProfile();

        syncHeaderAndPilotData();

        if (typeof playSynthSound === 'function') {
            playSynthSound(600, 800, 0.45, 'sine');
        }

        raiseToast(`Clearance accepted! Welcome back, Commander ${commanderProfile.commanderName}!`, '🚀');
        navigateTo('home-screen');

    } catch (error) {
        console.error("Sign in error:", error);
        let errMsg = "Access denied! Invalid credentials.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errMsg = "Access denied! Invalid email or password.";
        }
        raiseToast(errMsg, '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
    }
};

window.sendWelcomeEmail = function(email, callsign) {
    if (typeof emailjs === 'undefined') {
        console.warn("EmailJS SDK not loaded. Simulating email dispatch...");
        return;
    }
    
    const serviceID = 'service_space_ludo';
    const templateID = 'template_welcome';
    
    const templateParams = {
        to_email: email,
        to_name: callsign,
        subject: "🌌 WELCOME TO THE STELLAR COMMAND FLEET, PILOT!",
        message_html: `
            <div style="background-color: #050a1a; color: #ffffff; padding: 30px; border-radius: 16px; border: 2px solid #ff6d3a; font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; box-shadow: 0 0 20px rgba(255, 109, 58, 0.3);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 4rem;">🛸</span>
                    <h2 style="color: #ff6d3a; font-family: 'Segoe UI', sans-serif; letter-spacing: 2px; margin: 10px 0 0 0;">SPACE LUDO</h2>
                    <div style="color: #ffd600; font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase;">Stellar Command Dispatch</div>
                </div>
                
                <h3 style="color: #ffffff; border-bottom: 1px dashed rgba(255,109,58,0.3); padding-bottom: 8px; margin-bottom: 16px;">LOG ENTRY: SUCCESSFUL PILOT INITIATION</h3>
                
                <p style="line-height: 1.6; font-size: 0.9rem; color: #d1d5db;">
                    Greetings, Commander <strong>${callsign}</strong>!
                </p>
                <p style="line-height: 1.6; font-size: 0.9rem; color: #d1d5db;">
                    Your cosmic coordinates have been registered. The mothership has assigned you to lead your team of UFOs safely across the asteroid belt and safely into the Home Portal.
                </p>
                
                <div style="background: rgba(255, 109, 58, 0.08); border-left: 3px solid #ff6d3a; padding: 12px; border-radius: 8px; margin: 20px 0;">
                    <strong style="color: #ffd600; font-size: 0.8rem; display: block; margin-bottom: 4px;">🚀 LAUNCH PROTOCOLS:</strong>
                    <ul style="margin: 0; padding-left: 20px; font-size: 0.8rem; color: #cbd5e1; line-height: 1.5;">
                        <li><strong>Rocket Boosters:</strong> Land on rockets to blast forward.</li>
                        <li><strong>Wormhole Portals:</strong> Warp ahead through space-time gravity anomalies.</li>
                        <li><strong>Shield Core:</strong> Evade captures with shields activated.</li>
                    </ul>
                </div>
                
                <p style="line-height: 1.6; font-size: 0.9rem; color: #d1d5db;">
                    Pre-flight calibrations are complete. Prepare your engine thrusters and roll the celestial dice!
                </p>
                
                <div style="text-align: center; margin-top: 30px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 20px;">
                    <p style="font-size: 0.75rem; color: #94a3b8; margin: 0;">May the stars align in your quadrant.</p>
                    <strong style="color: #ff6d3a; font-size: 0.8rem; display: block; margin-top: 5px;">STELLAR HQ OPERATIONS</strong>
                </div>
            </div>
        `
    };

    emailjs.send(serviceID, templateID, templateParams)
        .then((response) => {
            console.log('EmailJS dispatch SUCCESS!', response.status, response.text);
            raiseToast('Welcome dispatch transmitted to your comm-deck!', '✉️');
        }, (error) => {
            console.error('EmailJS dispatch FAILED:', error);
            raiseToast('Signal broadcasted to your quadrant!', '📡');
        });
};

window.loginAsGuest = function() {
    const guestId = Math.floor(1000 + Math.random() * 9000);
    const name = `GUEST_${guestId}`;
    const randSpecIdx = Math.floor(Math.random() * ALIEN_SPECIES.length);
    const spec = ALIEN_SPECIES[randSpecIdx];

    commanderProfile.commanderName = name;
    commanderProfile.species = spec;
    commanderProfile.stars = 1000;
    commanderProfile.lastDailyLogin = 0;
    commanderProfile.isRegistered = true;

    saveProfile();
    syncHeaderAndPilotData();

    if (typeof playSynthSound === 'function') {
        playSynthSound(600, 800, 0.45, 'sine');
    }

    raiseToast(`Logged in as Guest! Welcome, Operator ${name}!`, '🛸');
    navigateTo('home-screen');
    if (typeof checkDailyLogin === 'function') {
        checkDailyLogin();
    }
};

window.loginWithGoogle = async function() {
    if (!window.Multiplayer || !window.Multiplayer.signInWithGoogle) {
        raiseToast('Network subsystem offline!', '⚠️');
        return;
    }

    raiseToast('Connecting to Google accounts...', '📡');

    try {
        const result = await window.Multiplayer.signInWithGoogle();
        if (!result || !result.user) {
            // Might have triggered a redirect which reloads the page
            return;
        }
        const user = result.user;

        // Fetch Firestore profile data
        let profileData = await window.Multiplayer.getProfileFromFirestore(user.uid);
        
        if (!profileData) {
            // New Google Pilot account creation
            profileData = {
                name: (user.displayName || "Google Pilot").toUpperCase(),
                species: "Terran (Human)",
                email: user.email,
                gamesPlayed: 0,
                totalWins: 0,
                unlockedBadges: ["First Flight"],
                stars: 1000,
                lastDailyLogin: 0
            };
            await window.Multiplayer.saveProfileToFirestore(user.uid, profileData);
        }

        // Load into active game session
        commanderProfile.commanderName = profileData.name || "COSMIC CADET";
        commanderProfile.species = profileData.species || "Terran (Human)";
        commanderProfile.gamesPlayed = profileData.gamesPlayed || 0;
        commanderProfile.totalWins = profileData.totalWins || 0;
        commanderProfile.unlockedBadges = profileData.unlockedBadges || ["First Flight"];
        commanderProfile.stars = profileData.stars !== undefined ? profileData.stars : 1000;
        commanderProfile.lastDailyLogin = profileData.lastDailyLogin || 0;
        commanderProfile.isRegistered = true;
        
        saveProfile();
        syncHeaderAndPilotData();

        if (typeof playSynthSound === 'function') {
            playSynthSound(600, 800, 0.45, 'sine');
        }

        raiseToast(`Clearance accepted! Welcome, Commander ${commanderProfile.commanderName}!`, '🚀');
        navigateTo('home-screen');
        
        if (typeof checkDailyLogin === 'function') {
            checkDailyLogin();
        }

    } catch (error) {
        console.error("Google Sign-In error:", error);
        let errMsg = "Google Sign-In failed!";
        if (error.code === 'auth/popup-closed-by-user') {
            errMsg = "Sign-In popup closed by user.";
        } else if (error.code === 'auth/cancelled-popup-request') {
            errMsg = "Sign-In process cancelled.";
        }
        raiseToast(errMsg, '⚠️');
        if (typeof playSynthSound === 'function') playSynthSound(200, 300, 0.4, 'sawtooth');
    }
};

window.logoutPilot = function() {
    if (welcomeBackTimeout) {
        clearTimeout(welcomeBackTimeout);
        welcomeBackTimeout = null;
    }
    
    // Reset active game state or timers
    if (typeof confirmQuitMission === 'function') {
        if (typeof state !== 'undefined' && state.gameConfig) {
            state.gameConfig.gameStarted = false;
        }
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('space_ludo_saved_flight_state');
        }
    }

    // Reset profile to default
    commanderProfile = {
        commanderName: "",
        species: "Terran (Human)",
        gamesPlayed: 0,
        totalWins: 0,
        unlockedBadges: ["First Flight"],
        isRegistered: false,
        stars: 0,
        lastDailyLogin: 0
    };
    saveProfile();
    
    // Clear input
    const nameInput = document.getElementById('login-username-input');
    if (nameInput) nameInput.value = '';

    selectedLoginSpecies = "Terran (Human)";
    initLoginAvatarGrid();

    // Show login form
    showRegistrationForm();

    raiseToast('Pilot logged out successfully.', '🔒');
    navigateTo('login-screen');
};

window.confirmWelcomeLogin = function() {
    if (welcomeBackTimeout) {
        clearTimeout(welcomeBackTimeout);
        welcomeBackTimeout = null;
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(600, 1000, 0.35, 'sine');
    }
    raiseToast(`Welcome back, Commander ${commanderProfile.commanderName}!`, '🧑‍🚀');
    navigateTo('home-screen');
    if (typeof checkDailyLogin === 'function') {
        checkDailyLogin();
    }
};

window.showRegistrationForm = function() {
    if (welcomeBackTimeout) {
        clearTimeout(welcomeBackTimeout);
        welcomeBackTimeout = null;
    }
    const formCard = document.getElementById('login-form-card');
    const welcomeCard = document.getElementById('login-welcome-card');
    if (formCard && welcomeCard) {
        welcomeCard.style.display = 'none';
        formCard.style.display = 'flex';
    }
};

function syncHeaderAndPilotData() {
    const name = commanderProfile.commanderName || "COSMIC CADET";
    const species = commanderProfile.species || "Terran (Human)";
    const stars = commanderProfile.stars !== undefined ? commanderProfile.stars : 1000;
    
    const headerName = document.getElementById('header-commander-name');
    if (headerName) headerName.innerText = name.toUpperCase();
    
    const headerAvatar = document.getElementById('header-commander-avatar');
    if (headerAvatar) {
        const avatarSrc = SPECIES_AVATARS[species];
        if (avatarSrc) {
            headerAvatar.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />`;
        } else {
            headerAvatar.innerText = SPECIES_EMOJIS[species] || "🧑‍🚀";
        }
    }

    const headerStars = document.getElementById('header-stars-balance');
    if (headerStars) {
        headerStars.innerText = Number(stars).toLocaleString() + " STARS";
    }

    const profileStars = document.getElementById('profile-stars-balance');
    if (profileStars) {
        profileStars.innerText = Number(stars).toLocaleString();
    }

    const profileNameInput = document.getElementById('profile-commander-name');
    if (profileNameInput) profileNameInput.value = name;
    
    const profileSpeciesSelect = document.getElementById('profile-species-select');
    if (profileSpeciesSelect) profileSpeciesSelect.value = species;

    // Synchronize stats display in profile tab
    const playedEl = document.getElementById('profile-games-played');
    if (playedEl) playedEl.innerText = commanderProfile.gamesPlayed;

    const winsEl = document.getElementById('profile-total-wins');
    if (winsEl) winsEl.innerText = commanderProfile.totalWins;

    // Calculate dynamic pilot level and XP progress
    const games = commanderProfile.gamesPlayed || 0;
    const wins = commanderProfile.totalWins || 0;
    const totalXp = (games * 100) + (wins * 300);
    const xpPerLevel = 1000;
    const level = Math.floor(totalXp / xpPerLevel) + 1;
    const xpCurrentMin = (level - 1) * xpPerLevel;
    const xpProgress = totalXp - xpCurrentMin;
    const xpNeeded = xpPerLevel;
    const xpPercent = Math.max(0, Math.min(100, Math.round((xpProgress / xpNeeded) * 100)));

    let pilotRank = "CADET";
    if (level >= 11) pilotRank = "GRAND ADMIRAL 👑";
    else if (level >= 8) pilotRank = "COMMANDER 🛸";
    else if (level >= 5) pilotRank = "CAPTAIN 🎖️";
    else if (level >= 3) pilotRank = "LIEUTENANT 👨‍✈️";
    else pilotRank = "CADET 🧑‍🚀";

    // Set Pilot Rank & Level details
    const rankEl = document.getElementById('pilot-rank-name');
    if (rankEl) rankEl.innerHTML = pilotRank;

    const levelEl = document.getElementById('pilot-level-number');
    if (levelEl) levelEl.innerText = level;

    const xpCurrentEl = document.getElementById('pilot-xp-current');
    if (xpCurrentEl) xpCurrentEl.innerText = `${xpProgress} / ${xpNeeded} XP`;

    const xpPctEl = document.getElementById('pilot-xp-pct');
    if (xpPctEl) xpPctEl.innerText = `${xpPercent}%`;

    const xpProgressFill = document.getElementById('pilot-xp-progress');
    if (xpProgressFill) xpProgressFill.style.width = `${xpPercent}%`;

    const avatarDisplay = document.getElementById('pilot-avatar-display');
    if (avatarDisplay) {
        const avatarSrc = SPECIES_AVATARS[species];
        if (avatarSrc) {
            avatarDisplay.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />`;
        } else {
            avatarDisplay.innerText = SPECIES_EMOJIS[species] || "🧑‍🚀";
        }
    }

    // Update Security Clearance Details
    const clearanceEmailEl = document.getElementById('pilot-clearance-email');
    const registryStatusEl = document.getElementById('pilot-registry-status');

    if (window.Multiplayer && window.Multiplayer.auth && window.Multiplayer.auth.currentUser) {
        const user = window.Multiplayer.auth.currentUser;
        if (clearanceEmailEl) {
            clearanceEmailEl.innerText = user.email ? user.email.toUpperCase() : "ANONYMOUS CLEARANCE";
        }
        if (registryStatusEl) {
            if (user.isAnonymous) {
                registryStatusEl.innerHTML = "GUEST CACHE 🟡";
                registryStatusEl.style.color = "#ffd600";
            } else {
                registryStatusEl.innerHTML = "CLOUD SYNC SECURED 🟢";
                registryStatusEl.style.color = "#10b981";
            }
        }
    } else {
        if (clearanceEmailEl) clearanceEmailEl.innerText = "OFFLINE ANONYMOUS";
        if (registryStatusEl) {
            registryStatusEl.innerHTML = "LOCAL TELEMETRY 🔴";
            registryStatusEl.style.color = "#ef4444";
        }
    }

    if (typeof syncPlayerSlotsWithSelectedColor === 'function') {
        syncPlayerSlotsWithSelectedColor();
    }
}

// All possible achievements/badges
const PATH_ACHIEVEMENTS = [
    { id: "First Flight", desc: "Launch your first UFO mission", icon: "🚀", unlocked: true },
    { id: "Solar Core", desc: "Win a match on any difficulty level", icon: "⭐", unlocked: true },
    { id: "Warp Hopper", desc: "Trigger 5 warp drive jumps in total", icon: "⚡", unlocked: true },
    { id: "Alien Nemesis", desc: "Exterminate 10 opponent pieces with Aliens", icon: "👾", unlocked: false },
    { id: "Clash Master", desc: "Survive and win a UFO Clash special match", icon: "☄️", unlocked: false }
];

let wakeLock = null;
async function requestWakeLock() {
    if (localStorage.getItem('cosmic_wake_lock') === 'disabled') return;
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log("Wake Lock acquired successfully");
        } catch (err) {
            console.warn("Wake lock failed:", err);
        }
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log("Wake Lock released successfully");
        }).catch(err => {
            console.warn("Release wake lock error:", err);
        });
    }
}

function initNavigation() {
    // Initialize default local settings if not present
    if (!localStorage.getItem('cosmic_music_volume')) localStorage.setItem('cosmic_music_volume', '0.5');
    if (!localStorage.getItem('cosmic_sfx_volume')) localStorage.setItem('cosmic_sfx_volume', '0.6');
    if (!localStorage.getItem('cosmic_dice_mode')) localStorage.setItem('cosmic_dice_mode', '3d');
    if (!localStorage.getItem('cosmic_particle_level')) localStorage.setItem('cosmic_particle_level', 'high');
    if (!localStorage.getItem('cosmic_wake_lock')) localStorage.setItem('cosmic_wake_lock', 'enabled');
    if (!localStorage.getItem('cosmic_language')) localStorage.setItem('cosmic_language', 'en');

    // Load local storage states if available
    loadProfileAndLeaderboard();

    // Initialize EmailJS key
    if (typeof emailjs !== 'undefined') {
        emailjs.init({
            publicKey: "p-eB1f2a3g4h5i6j7k", 
        });
    }

    // Show splash initially, and schedule auto-navigation to Home or Login after 2.2 seconds
    navigateTo('splash-screen');
    
    initLoginAvatarGrid();
    
    setTimeout(() => {
        if (commanderProfile && commanderProfile.isRegistered) {
            // Welcome Back
            const formCard = document.getElementById('login-form-card');
            const welcomeCard = document.getElementById('login-welcome-card');
            
            const welcomeName = document.getElementById('welcome-name-display');
            if (welcomeName) welcomeName.innerText = commanderProfile.commanderName.toUpperCase();
            
            const welcomeAvatar = document.getElementById('welcome-avatar-display');
            if (welcomeAvatar) {
                const avatarSrc = SPECIES_AVATARS[commanderProfile.species];
                if (avatarSrc) {
                    welcomeAvatar.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />`;
                } else {
                    welcomeAvatar.innerText = SPECIES_EMOJIS[commanderProfile.species] || "🧑‍🚀";
                }
            }
            
            const played = document.getElementById('welcome-stat-played');
            if (played) played.innerText = commanderProfile.gamesPlayed;
            
            const wins = document.getElementById('welcome-stat-wins');
            if (wins) wins.innerText = commanderProfile.totalWins;
            
            if (formCard && welcomeCard) {
                formCard.style.display = 'none';
                welcomeCard.style.display = 'flex';
            }
            
            navigateTo('login-screen');
            
            welcomeBackTimeout = setTimeout(() => {
                welcomeBackTimeout = null;
                raiseToast(`Welcome back, Commander ${commanderProfile.commanderName}!`, '🧑‍🚀');
                navigateTo('home-screen');
                if (typeof checkDailyLogin === 'function') {
                    checkDailyLogin();
                }
            }, 1800);
        } else {
            // Fresh signup
            const formCard = document.getElementById('login-form-card');
            const welcomeCard = document.getElementById('login-welcome-card');
            if (formCard && welcomeCard) {
                formCard.style.display = 'flex';
                welcomeCard.style.display = 'none';
            }
            navigateTo('login-screen');
        }
        
        syncHeaderAndPilotData();
    }, 2200);

    // Initial render of sections
    if (typeof renderTabBar === 'function') renderTabBar();
    renderLeaderboard();
    renderProfileView();
    renderMoreFunSection();
    renderSettingsView();
}

let navigationHistory = [];

function navigateTo(screenId, pushToHistory = true) {
    if (!screenId) return;

    // Control Wake Lock
    if (screenId === 'game-screen' || screenId === 'snakes-ladders-view') {
        requestWakeLock();
    } else {
        releaseWakeLock();
    }

    // Check if target is already current
    if (currentScreen === screenId) return;

    // Play subtle menu beep
    if (typeof playSynthSound === 'function') {
        playSynthSound(400, 40, 0.2, 'sine');
    }

    // Push previous screen to history stack
    // Splash screen should never be pushed to history so the user can never navigate back to it
    if (pushToHistory && currentScreen && currentScreen !== 'splash-screen' && currentScreen !== 'splash' && screenId !== 'splash-screen') {
        navigationHistory.push(currentScreen);
    }

    // Hide all view screens
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
        view.style.pointerEvents = 'none';
        view.style.visibility = 'hidden';
        view.style.display = 'none';
    });

    // Handle game-wrapper special hidden class (Screen 2)
    const gameWrapper = document.querySelector('.game-wrapper');
    if (screenId === 'game-screen') {
        if (gameWrapper) {
            gameWrapper.classList.remove('game-hidden');
            gameWrapper.style.pointerEvents = 'auto';
            gameWrapper.style.visibility = 'visible';
        }
        // Hide setup modal as well
        const setupModal = document.getElementById('setup-modal');
        if (setupModal) {
            setupModal.classList.remove('active');
            setupModal.style.pointerEvents = 'none';
            setupModal.style.visibility = 'hidden';
        }
    } else {
        if (gameWrapper) {
            gameWrapper.classList.add('game-hidden');
            gameWrapper.style.pointerEvents = 'none';
            gameWrapper.style.visibility = 'hidden';
        }
    }

    // Handle setup-modal special visibility
    const setupModal = document.getElementById('setup-modal');
    if (screenId === 'setup-screen') {
        if (setupModal) {
            setupModal.classList.add('active');
            setupModal.style.pointerEvents = 'auto';
            setupModal.style.visibility = 'visible';
            // Ensure resume button handles active games correctly
            if (state && state.gameConfig && state.gameConfig.gameStarted) {
                const rBtn = document.getElementById('setup-resume-btn');
                if (rBtn) rBtn.style.display = 'block';
            }
        }
    } else if (screenId !== 'game-screen') {
        if (setupModal) {
            setupModal.classList.remove('active');
            setupModal.style.pointerEvents = 'none';
            setupModal.style.visibility = 'hidden';
        }
    }

    // Show specified screen
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.remove('hidden');
        target.style.pointerEvents = 'auto';
        target.style.visibility = 'visible';
        target.style.display = '';
    }

    currentScreen = screenId;

    // Trigger view background music routing
    if (typeof playBackgroundMusicForView === 'function') {
        playBackgroundMusicForView(screenId);
    }

    // Set canvas for particle engine
    if (window.particleEngine) {
        if (screenId === 'game-screen') {
            window.particleEngine.setCanvas('vfx-canvas');
        } else if (screenId === 'snakes-ladders-view') {
            window.particleEngine.setCanvas('sl-vfx-canvas');
        }
    }

    if (screenId === 'game-screen' && typeof isBot === 'function' && isBot(state.activePlayer)) {
        if (typeof scheduleBotTurn === 'function') {
            scheduleBotTurn(800);
        }
    }
}

function showQuitConfirmation() {
    let confirmOverlay = document.getElementById('quit-confirm-overlay');
    if (!confirmOverlay) {
        confirmOverlay = document.createElement('div');
        confirmOverlay.id = 'quit-confirm-overlay';
        confirmOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 5, 20, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        confirmOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1e0a44 0%, #0c0420 100%);
                border: 2px solid var(--red, #ff4081);
                box-shadow: 0 0 30px rgba(255, 64, 129, 0.4);
                padding: 24px;
                border-radius: 16px;
                max-width: 90%;
                width: 320px;
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            " id="quit-confirm-card">
                <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 12px; font-family: 'Orbitron', sans-serif; font-weight: 900; letter-spacing: 1px;">PAUSE / ABORT MISSION</h3>
                <p style="color: #cfd8dc; font-size: 0.9rem; margin-bottom: 24px;">Are you sure you want to quit the current celestial voyage?</p>
                <div style="display: flex; gap: 12px;">
                    <button style="
                        flex: 1;
                        padding: 10px 16px;
                        background: rgba(255, 255, 255, 0.08);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: #ffffff;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.2s;
                    " onclick="hideQuitConfirmation()">RESUME</button>
                    <button style="
                        flex: 1;
                        padding: 10px 16px;
                        background: radial-gradient(circle, #ff4081 0%, #c2185b 100%);
                        border: none;
                        color: #ffffff;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        box-shadow: 0 0 10px rgba(255, 64, 129, 0.4);
                        transition: all 0.2s;
                    " onclick="confirmQuitMission()">QUIT</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmOverlay);
    }
    
    // Show it cleanly
    confirmOverlay.style.pointerEvents = 'auto';
    confirmOverlay.style.opacity = '1';
    setTimeout(() => {
        const card = document.getElementById('quit-confirm-card');
        if (card) card.style.transform = 'scale(1)';
    }, 10);
    
    // Play sound
    if (typeof playSynthSound === 'function') {
        playSynthSound(300, 150, 0.3, 'sawtooth');
    }
}

window.hideQuitConfirmation = function() {
    const confirmOverlay = document.getElementById('quit-confirm-overlay');
    const card = document.getElementById('quit-confirm-card');
    if (confirmOverlay) {
        if (card) card.style.transform = 'scale(0.9)';
        confirmOverlay.style.opacity = '0';
        confirmOverlay.style.pointerEvents = 'none';
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 400, 0.15, 'sine');
    }
}

window.confirmQuitMission = function() {
    window.hideQuitConfirmation();
    // Reset any game state active loops
    if (typeof clearAllThinkingIndicators === 'function') {
        clearAllThinkingIndicators();
    }
    // Set gameStarted to false so a resume button doesn't linger
    if (typeof state !== 'undefined' && state.gameConfig) {
        state.gameConfig.gameStarted = false;
    }
    // Delete any saved game from storage so it does not offer to resume a quit game
    if (typeof clearSavedGameState === 'function') {
        clearSavedGameState();
    }
    // Navigate home
    navigateTo('home-screen');
}

function navigateBack() {
    // Mini-game: Nebula Flight Run (Dodger)
    if (currentScreen === 'cosmic-dodger-view') {
        if (typeof stopDodgerGame === 'function') stopDodgerGame();
        navigateTo('home-screen', false);
        switchTab('morefun');
        return true;
    }
    // Mini-game: Starship Laser Assault (Shooter)
    if (currentScreen === 'starship-shooter-view') {
        if (typeof stopShooterGame === 'function') stopShooterGame();
        navigateTo('home-screen', false);
        switchTab('morefun');
        return true;
    }
    // Rockets & Wormholes board
    if (currentScreen === 'snakes-ladders-view') {
        navigateTo('home-screen', false);
        return true;
    }
    // Results screen
    if (currentScreen === 'results-screen') {
        navigateTo('home-screen', false);
        return true;
    }
    // Main Ludo game
    if (currentScreen === 'game-screen') {
        showQuitConfirmation();
        return true;
    }
    // Setup screen
    if (currentScreen === 'setup-screen') {
        navigateTo('home-screen');
        return true;
    }
    // Multiplayer lobby
    if (currentScreen === 'multiplayer-lobby-screen') {
        navigateTo('home-screen', false);
        return true;
    }
    // Home screen — show exit confirmation
    if (currentScreen === 'home-screen' || navigationHistory.length === 0) {
        showExitConfirmation();
        return true;
    }
    // Default: pop from history stack
    const prevScreen = navigationHistory.pop();
    navigateTo(prevScreen, false);
    return true;
}
window.navigateBack = navigateBack;

// Exit App Confirmation Dialog (shown when pressing back on home screen)
function showExitConfirmation() {
    let exitOverlay = document.getElementById('exit-confirm-overlay');
    if (!exitOverlay) {
        exitOverlay = document.createElement('div');
        exitOverlay.id = 'exit-confirm-overlay';
        exitOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 5, 20, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            font-family: 'Nunito', sans-serif;
        `;
        exitOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #1e0a44 0%, #0c0420 100%);
                border: 2px solid var(--cyan, #00e5ff);
                box-shadow: 0 0 30px rgba(0, 229, 255, 0.4);
                padding: 24px;
                border-radius: 16px;
                max-width: 90%;
                width: 320px;
                text-align: center;
                transform: scale(0.9);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            " id="exit-confirm-card">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🛸</div>
                <h3 style="color: #ffffff; margin-top: 0; margin-bottom: 12px; font-family: 'Orbitron', 'Nunito', sans-serif; font-weight: 900; letter-spacing: 1px;">EXIT SPACE LUDO?</h3>
                <p style="color: #cfd8dc; font-size: 0.9rem; margin-bottom: 24px;">Are you sure you want to leave the cosmic battleground?</p>
                <div style="display: flex; gap: 12px;">
                    <button style="
                        flex: 1;
                        padding: 10px 16px;
                        background: rgba(255, 255, 255, 0.08);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: #ffffff;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        transition: all 0.2s;
                    " onclick="hideExitConfirmation()">STAY</button>
                    <button style="
                        flex: 1;
                        padding: 10px 16px;
                        background: radial-gradient(circle, #ff4081 0%, #c2185b 100%);
                        border: none;
                        color: #ffffff;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        box-shadow: 0 0 10px rgba(255, 64, 129, 0.4);
                        transition: all 0.2s;
                    " onclick="confirmExitApp()">EXIT</button>
                </div>
            </div>
        `;
        document.body.appendChild(exitOverlay);
    }

    // Show it cleanly
    exitOverlay.style.pointerEvents = 'auto';
    exitOverlay.style.opacity = '1';
    setTimeout(() => {
        const card = document.getElementById('exit-confirm-card');
        if (card) card.style.transform = 'scale(1)';
    }, 10);

    if (typeof playSynthSound === 'function') {
        playSynthSound(300, 150, 0.3, 'sawtooth');
    }
}

window.hideExitConfirmation = function() {
    const exitOverlay = document.getElementById('exit-confirm-overlay');
    const card = document.getElementById('exit-confirm-card');
    if (exitOverlay) {
        if (card) card.style.transform = 'scale(0.9)';
        exitOverlay.style.opacity = '0';
        exitOverlay.style.pointerEvents = 'none';
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 400, 0.15, 'sine');
    }
}

window.confirmExitApp = function() {
    window.hideExitConfirmation();
    if (window.AndroidBridge && window.AndroidBridge.exitApp) {
        window.AndroidBridge.exitApp();
    }
}

// Bottom tab switching
function switchTab(tabId, event) {
    if (event) event.stopPropagation();
    
    if (typeof playSynthSound === 'function') {
        playSynthSound(350, 30, 0.25, 'sine');
    }

    activeTab = tabId;

    // Highlight active nav tab button
    document.querySelectorAll('.nav-item').forEach(btn => {
        const itemTab = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (itemTab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Switch visible tab panel
    document.querySelectorAll('.tab-content').forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    // Play tab background music
    if (typeof playBackgroundMusicForView === 'function') {
        playBackgroundMusicForView(tabId);
    }
}

// ─── Power-Up Briefing Pop-up ───────────────────────────────────────────────
function showPowerUpBriefing(onConfirm) {
    if (document.getElementById('powerup-briefing-overlay')) {
        onConfirm();
        return;
    }

    const POWERUPS_BRIEFING = [
        { id: 'shield_token', icon: '🛡️', name: 'SHIELD BARRIER', desc: 'Protects your UFO from being captured for 3 turns.', color: '#38bdf8' },
        { id: 'freeze_opponent', icon: '❄️', name: 'CRYSTAL STORM',  desc: 'Freezes the next player — their turn is completely skipped!', color: '#3cc6ff' },
        { id: 'teleport_jump', icon: '🌀', name: 'WORMHOLE PORTAL', desc: 'Instantly teleports your starship 6 steps forward.', color: '#d946ef' },
        { id: 'rocket_boost', icon: '🚀', name: 'ROCKET BOOST',   desc: 'Blasts your starship 10 steps forward at full throttle.', color: '#ef4444' },
        { id: 'lightning_fire', icon: '🔥', name: 'LIGHTNING CORE', desc: 'Your UFO burns hot — any opponent that touches it gets vaporized!', color: '#ff4500' },
        { id: 'extra_roll', icon: '🎲', name: 'TIME LOOP',      desc: 'Bends time to grant you an immediate extra dice roll.', color: '#22c55e' }
    ];

    const overlay = document.createElement('div');
    overlay.id = 'powerup-briefing-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(2, 0, 20, 0.92);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        z-index: 99999;
        opacity: 0; transition: opacity 0.35s ease;
        font-family: 'Orbitron', 'Nunito', sans-serif;
        padding: 16px; box-sizing: border-box;
    `;

    const cardsHtml = POWERUPS_BRIEFING.map(p => `
        <div style="
            display: flex; align-items: center; gap: 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid ${p.color}44;
            border-left: 3px solid ${p.color};
            border-radius: 10px;
            padding: 10px 14px;
            transition: transform 0.15s ease;
        ">
            <span style="font-size: 1.6rem; flex-shrink:0; display: flex; align-items: center;">
                ${(typeof POWERUP_ICON_SRCS !== 'undefined' && POWERUP_ICON_SRCS[p.id]) ? `<img src="${POWERUP_ICON_SRCS[p.id]}" style="width: 32px; height: 32px; object-fit: contain;" />` : p.icon}
            </span>
            <div style="flex:1; min-width:0;">
                <div style="font-size: 0.6rem; font-weight: 900; color: ${p.color}; letter-spacing: 1.5px; margin-bottom: 2px;">${p.name}</div>
                <div style="font-size: 0.65rem; color: #cbd5e1; line-height: 1.4; font-family: 'Nunito', sans-serif; font-weight: 600;">${p.desc}</div>
            </div>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div id="powerup-briefing-card" style="
            background: linear-gradient(160deg, #0d0525 0%, #050a1a 60%, #0a0220 100%);
            border: 2px solid rgba(0,229,255,0.35);
            box-shadow: 0 0 60px rgba(0,229,255,0.18), 0 0 120px rgba(138,43,226,0.12);
            border-radius: 20px;
            width: 100%; max-width: 420px;
            max-height: 90vh; overflow-y: auto;
            padding: 24px 20px 20px;
            box-sizing: border-box;
            transform: scale(0.88) translateY(20px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        ">
            <!-- Header -->
            <div style="text-align:center; margin-bottom: 18px;">
                <img src="images/generated/promo/art_feature_powerups.png" style="width: 100%; border-radius: 12px; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); object-fit: cover; max-height: 120px;" />
                <h2 style="margin:0 0 4px; font-size: 1rem; letter-spacing: 2px; color: #ffffff; font-weight: 900;">POWER-UP BRIEFING</h2>
                <p style="margin:0; font-size: 0.65rem; color: #64748b; font-family:'Nunito',sans-serif; letter-spacing:0.5px;">Land on glowing cells to activate these instantly!</p>
            </div>

            <!-- Power-up cards -->
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
                ${cardsHtml}
            </div>

            <!-- Tip banner -->
            <div style="
                background: rgba(0,229,255,0.07);
                border: 1px solid rgba(0,229,255,0.2);
                border-radius: 10px; padding: 10px 14px;
                margin-bottom: 18px;
                display: flex; align-items: center; gap: 10px;
            ">
                <span style="font-size:1.1rem;">💡</span>
                <span style="font-size:0.6rem; color:#94a3b8; font-family:'Nunito',sans-serif; line-height:1.4;">
                    Power-ups activate <strong style="color:#00e5ff;">instantly</strong> when your UFO lands on them. No inventory needed — pure cosmic chaos!
                </span>
            </div>

            <!-- CTA Button -->
            <button id="powerup-briefing-btn" style="
                width: 100%;
                padding: 14px;
                background: linear-gradient(135deg, #00e5ff 0%, #7c3aed 100%);
                border: none; border-radius: 12px;
                color: #ffffff; font-weight: 900;
                font-size: 0.85rem; letter-spacing: 2px;
                cursor: pointer; font-family: 'Orbitron', sans-serif;
                box-shadow: 0 0 20px rgba(0,229,255,0.35);
                transition: transform 0.15s ease, box-shadow 0.15s ease;
            ">🚀 LET'S PLAY!</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = document.getElementById('powerup-briefing-card');
        if (card) {
            requestAnimationFrame(() => {
                card.style.transform = 'scale(1) translateY(0)';
            });
        }
    });

    // Button hover
    const btn = document.getElementById('powerup-briefing-btn');
    if (btn) {
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.03)'; btn.style.boxShadow = '0 0 30px rgba(0,229,255,0.5)'; });
        btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)';    btn.style.boxShadow = '0 0 20px rgba(0,229,255,0.35)'; });
        btn.addEventListener('click', () => {
            overlay.style.opacity = '0';
            const card2 = document.getElementById('powerup-briefing-card');
            if (card2) card2.style.transform = 'scale(0.9) translateY(10px)';
            setTimeout(() => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                onConfirm();
            }, 320);
            if (typeof playSynthSound === 'function') playSynthSound(600, 1400, 0.3, 'sine');
        });
    }

    if (typeof playSynthSound === 'function') playSynthSound(300, 800, 0.25, 'triangle');
}

// Mode card initializers in setup modal
function selectPassAndPlay() {
    if (currentScreen === 'game-screen') return;
    showPowerUpBriefing(() => {
        isClashMode = false;
        lobbyConfig.mode = 'passAndPlay';
        lobbyConfig.playerCount = 4;
        lobbyConfig.playerTypes = ['human', 'bot', 'bot', 'bot'];
        lobbyConfig.botDifficulty = 'medium';
        lobbyConfig.humanColorIndex = 0;
        syncPlayerSlotsWithSelectedColor();
        renderSetupUI();
        navigateTo('setup-screen');
    });
}

window.openMiniLudo = function() {
    if (currentScreen === 'game-screen') return;
    isClashMode = false;
    lobbyConfig.mode = 'miniLudo';
    lobbyConfig.playerCount = 4;
    lobbyConfig.playerTypes = ['human', 'bot', 'bot', 'bot'];
    lobbyConfig.botDifficulty = 'medium';
    lobbyConfig.humanColorIndex = 0;
    syncPlayerSlotsWithSelectedColor();
    renderSetupUI();
    navigateTo('setup-screen');
};

function selectQuickPlay() {
    if (currentScreen === 'game-screen') return;
    showPowerUpBriefing(() => {
        isClashMode = false;
        lobbyConfig.mode = 'quick';
        lobbyConfig.playerCount = 4;
        lobbyConfig.playerTypes = ['human', 'bot', 'bot', 'bot'];
        lobbyConfig.botDifficulty = 'medium';
        lobbyConfig.humanColorIndex = 0;
        syncPlayerSlotsWithSelectedColor();
        renderSetupUI();
        navigateTo('setup-screen');
    });
}

function selectUFOClash() {
    if (currentScreen === 'game-screen') return;
    showPowerUpBriefing(() => {
        isClashMode = true;
        lobbyConfig.mode = 'clash';
        lobbyConfig.playerCount = 4;
        lobbyConfig.playerTypes = ['human', 'bot', 'bot', 'bot'];
        lobbyConfig.botDifficulty = 'hard';
        lobbyConfig.humanColorIndex = 0;
        syncPlayerSlotsWithSelectedColor();
        renderSetupUI();
        navigateTo('setup-screen');
    });
}
function selectMoreFun() {
    if (currentScreen === 'game-screen') return;
    // Navigate to 'home-screen' and switch tab to update currentScreen correctly
    navigateTo('home-screen');
    switchTab('morefun');
}

// Leaderboard implementation using Firestore if online, otherwise fallback
async function renderLeaderboard() {
    const listContainer = document.getElementById('leaderboard-record-list');
    if (!listContainer) return;

    // Show glowing loading state first
    listContainer.innerHTML = `
        <div class="leaderboard-loading-scanner">
            <div class="scanner-bar"></div>
            <span>TRANSMITTING TELEMETRY SYNC FROM CLOUD SECTOR...</span>
        </div>
    `;

    let records = [];
    let isFetchedFromCloud = false;

    if (window.Multiplayer && window.Multiplayer.auth.currentUser) {
        try {
            // Fetch top 10 players from Firebase
            const cloudPlayers = await window.Multiplayer.getTopPlayers(10);
            if (cloudPlayers && cloudPlayers.length > 0) {
                records = cloudPlayers.map((cp, index) => {
                    const games = cp.gamesPlayed || 0;
                    const wins = cp.totalWins || 0;
                    const winRateVal = games > 0 ? Math.round((wins / games) * 100) : 0;
                    return {
                        rank: index + 1,
                        name: cp.name || "UNKNOWN VOYAGER",
                        winRate: `${winRateVal}%`,
                        rankPoints: cp.stars || 0,
                        species: cp.species || "Terran (Human)",
                        gamesPlayed: games,
                        totalWins: wins
                    };
                });
                isFetchedFromCloud = true;
            }
        } catch (e) {
            console.error("Leaderboard cloud sync failed, using offline telemetry", e);
        }
    }

    if (!isFetchedFromCloud) {
        // Fallback to local ranking
        let localRecords = [...leaderboardRecords];
        const commanderExists = localRecords.some(r => r.name === commanderProfile.commanderName);
        if (!commanderExists && commanderProfile.commanderName) {
            const games = commanderProfile.gamesPlayed || 0;
            const wins = commanderProfile.totalWins || 0;
            const winRateVal = games > 0 ? Math.round((wins / games) * 100) : 0;
            localRecords.push({
                name: commanderProfile.commanderName,
                species: commanderProfile.species,
                rankPoints: commanderProfile.stars || 0,
                winRate: `${winRateVal}%`,
                gamesPlayed: games,
                totalWins: wins
            });
        }
        localRecords.sort((a, b) => b.rankPoints - a.rankPoints);
        records = localRecords.slice(0, 10);
    }

    if (records.length === 0) {
        listContainer.innerHTML = `
            <div class="leaderboard-empty" style="text-align: center; padding: 24px;">
                <img src="images/generated/promo/art_empty_leaderboard.png" style="width: 150px; opacity: 0.85; margin-bottom: 12px;" />
                <div>Telemetry core empty. Be the first to rank!</div>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = records.map((r, i) => {
        let medalHTML = "";
        if (i === 0) medalHTML = `<img src="images/generated/icons/icon_crown.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;" />`;
        else if (i === 1) medalHTML = `<img src="images/generated/icons/icon_medal_silver.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;" />`;
        else if (i === 2) medalHTML = `<img src="images/generated/icons/icon_medal_bronze.png" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 4px;" />`;
        
        const avatarSrc = SPECIES_AVATARS[r.species];
        const avatarHTML = avatarSrc ? `<img src="${avatarSrc}" style="width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 6px; object-fit: contain;" />` : (SPECIES_EMOJIS[r.species] || "👽");
        
        const isSelf = r.name === commanderProfile.commanderName;
        const rowClass = isSelf ? 'leaderboard-row-self' : '';
        
        return `
            <div class="leaderboard-row ${rowClass}">
                <div class="lead-rank">${medalHTML || (i + 1)}</div>
                <div class="lead-name-box">
                    <span class="lead-name" style="display: flex; align-items: center; gap: 4px;">${avatarHTML} ${escapeHTML(r.name)}</span>
                    <span class="lead-species">${r.species}</span>
                </div>
                <div class="lead-pts">${r.rankPoints} ⭐️</div>
                <div class="lead-rate">${r.winRate} WR</div>
            </div>
        `;
    }).join('');
}

// Profile implementation
function renderProfileView() {
    const nameInput = document.getElementById('profile-commander-name');
    if (nameInput) nameInput.value = commanderProfile.commanderName;

    const speciesSelect = document.getElementById('profile-species-select');
    if (speciesSelect) {
        speciesSelect.innerHTML = ALIEN_SPECIES.map(spec => {
            const sel = spec === commanderProfile.species ? 'selected' : '';
            return `<option value="${spec}" ${sel}>${spec}</option>`;
        }).join('');
    }

    const playedEl = document.getElementById('profile-games-played');
    if (playedEl) playedEl.innerText = commanderProfile.gamesPlayed;

    const winsEl = document.getElementById('profile-total-wins');
    if (winsEl) winsEl.innerText = commanderProfile.totalWins;

    const starsEl = document.getElementById('profile-stars-balance');
    if (starsEl) starsEl.innerText = Number(commanderProfile.stars || 0).toLocaleString();

    renderProfileBadges();
    renderSkinsShop();
}

function renderSkinsShop() {
    const grid = document.getElementById('profile-skins-shop-grid');
    if (!grid) return;

    const unlocked = commanderProfile.unlockedSkins || ["classic"];
    const equipped = commanderProfile.equippedSkin || "classic";

    grid.innerHTML = UFO_SKINS.map(skin => {
        const isUnlocked = unlocked.includes(skin.id);
        const isEquipped = equipped === skin.id;

        let btnClass = "";
        let btnText = "";
        let btnClick = "";

        if (isEquipped) {
            btnClass = "skin-btn-equipped";
            btnText = "EQUIPPED";
            btnClick = `disabled`;
        } else if (isUnlocked) {
            btnClass = "skin-btn-equip";
            btnText = "EQUIP";
            btnClick = `onclick="window.buyOrEquipSkin('${skin.id}')"`;
        } else {
            btnClass = "skin-btn-buy";
            btnText = `⭐ ${skin.cost}`;
            btnClick = `onclick="window.buyOrEquipSkin('${skin.id}')"`;
        }

        const equippedCardClass = isEquipped ? "equipped" : "";

        return `
            <div class="skin-item-card ${equippedCardClass}">
                <div class="skin-item-emoji"><img src="images/generated/pawns/skin_pawn_${skin.id}.png" style="width: 48px; height: 48px; object-fit: contain;" /></div>
                <div class="skin-item-title">${skin.name}</div>
                <div class="skin-item-desc">${skin.desc}</div>
                <button type="button" class="skin-item-btn ${btnClass}" ${btnClick}>${btnText}</button>
            </div>
        `;
    }).join('');
}

window.buyOrEquipSkin = async function(skinId) {
    const skin = UFO_SKINS.find(s => s.id === skinId);
    if (!skin) return;

    if (!commanderProfile.unlockedSkins) {
        commanderProfile.unlockedSkins = ["classic"];
    }

    const isUnlocked = commanderProfile.unlockedSkins.includes(skinId);

    if (isUnlocked) {
        commanderProfile.equippedSkin = skinId;
        saveProfile();
        syncHeaderAndPilotData();
        renderSkinsShop();
        
        if (typeof playSynthSound === 'function') {
            playSynthSound(600, 100, 0.15, 'sine');
        }
        raiseToast(`${skin.name} equipped as your main UFO token!`, "🛸");
    } else {
        const stars = commanderProfile.stars || 0;
        if (stars >= skin.cost) {
            commanderProfile.stars -= skin.cost;
            commanderProfile.unlockedSkins.push(skinId);
            commanderProfile.equippedSkin = skinId;
            saveProfile();
            syncHeaderAndPilotData();
            renderSkinsShop();

            if (typeof playSynthSound === 'function') {
                playSynthSound(523.25, 120, 0.1, 'sine');
                setTimeout(() => {
                    playSynthSound(659.25, 120, 0.1, 'sine');
                    setTimeout(() => {
                        playSynthSound(783.99, 120, 0.1, 'sine');
                        setTimeout(() => {
                            playSynthSound(1046.50, 300, 0.25, 'sine');
                        }, 120);
                    }, 120);
                }, 120);
            }
            raiseToast(`Successfully unlocked and equipped ${skin.name}! -${skin.cost} Stars!`, "✨🚀");
        } else {
            if (typeof playSynthSound === 'function') {
                playSynthSound(180, 400, 0.45, 'sawtooth');
            }
            raiseToast(`Insufficient stars! You need ${skin.cost - stars} more stars to unlock ${skin.name}.`, "⚠️");
        }
    }
};

function renderProfileBadges() {
    const container = document.getElementById('profile-badges-list');
    if (!container) return;

    container.innerHTML = PATH_ACHIEVEMENTS.map(ach => {
        const isUnlocked = commanderProfile.unlockedBadges.includes(ach.id) || ach.unlocked;
        return `
            <div class="badge-item ${isUnlocked ? 'badge-unlocked' : 'badge-locked'}">
                <span class="badge-icon">${ach.icon}</span>
                <div class="badge-info">
                    <span class="badge-title">${ach.id}</span>
                    <span class="badge-desc">${ach.desc}</span>
                </div>
                <span class="badge-status-tag">${isUnlocked ? 'Unlocked' : 'Locked'}</span>
            </div>
        `;
    }).join('');
}

function updateCommanderName(val) {
    const sanitized = val.trim().toUpperCase() || "COSMIC CADET";
    commanderProfile.commanderName = sanitized;
    saveProfile();
    const headerName = document.getElementById('header-commander-name');
    if (headerName) headerName.innerText = sanitized;
}

function updateCommanderSpecies(val) {
    commanderProfile.species = val;
    saveProfile();
    
    const headerAvatar = document.getElementById('header-commander-avatar');
    if (headerAvatar) {
        const avatarSrc = SPECIES_AVATARS[val];
        if (avatarSrc) {
            headerAvatar.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />`;
        } else {
            headerAvatar.innerText = SPECIES_EMOJIS[val] || "🧑‍🚀";
        }
    }
    
    const avatarDisplay = document.getElementById('pilot-avatar-display');
    if (avatarDisplay) {
        const avatarSrc = SPECIES_AVATARS[val];
        if (avatarSrc) {
            avatarDisplay.innerHTML = `<img src="${avatarSrc}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 50%; display: block;" />`;
        } else {
            avatarDisplay.innerText = SPECIES_EMOJIS[val] || "🧑‍🚀";
        }
    }
}

// Save & Load state to LocalStorage
function saveProfile() {
    localStorage.setItem('cosmic_profile', JSON.stringify(commanderProfile));
    if (typeof syncProfileToFirebase === 'function') {
        syncProfileToFirebase();
    }
}

window.syncProfileToFirebase = async function() {
    if (window.Multiplayer && window.Multiplayer.auth.currentUser) {
        try {
            await window.Multiplayer.saveProfileToFirestore(window.Multiplayer.auth.currentUser.uid, {
                name: commanderProfile.commanderName,
                species: commanderProfile.species,
                gamesPlayed: commanderProfile.gamesPlayed,
                totalWins: commanderProfile.totalWins,
                stars: commanderProfile.stars,
                lastDailyLogin: commanderProfile.lastDailyLogin,
                unlockedBadges: commanderProfile.unlockedBadges,
                unlockedSkins: commanderProfile.unlockedSkins || ["classic"],
                equippedSkin: commanderProfile.equippedSkin || "classic"
            });
        } catch (e) {
            console.error("Failed to sync profile to Firebase:", e);
        }
    }
};

window.simulateStarPurchase = function(amount, cost) {
    if (typeof playSynthSound === 'function') {
        playSynthSound(500, 100, 0.25, 'sine');
    }
    
    const confirmBuy = confirm(`🌌 COSMIC DECK DISPATCH:\n\nWould you like to simulate purchasing the packet for $${cost} Play Money to summon +${amount} Stars? 🌟`);
    
    if (confirmBuy) {
        commanderProfile.stars = (commanderProfile.stars || 0) + amount;
        saveProfile();
        syncHeaderAndPilotData();
        
        // Spawn particle confetti burst at the top header balance element
        const headerStars = document.getElementById('header-stars-balance');
        if (headerStars && typeof triggerConfettiBurst === 'function') {
            const rect = headerStars.getBoundingClientRect();
            triggerConfettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
        
        raiseToast(`Purchase complete! +${amount} Stars credited! 🌌`, '🌌');
        
        if (typeof playSynthSound === 'function') {
            playSynthSound(800, 1400, 0.45, 'sine');
        }
        
        renderProfileView();
    }
};

window.checkDailyLogin = function() {
    if (!commanderProfile) return;
    
    const now = Date.now();
    const lastClaim = commanderProfile.lastDailyLogin || 0;
    
    // 20 hours leeway is industry standard so players can claim daily allowances
    if (now - lastClaim >= 20 * 60 * 60 * 1000) {
        const overlay = document.getElementById('daily-reward-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.remove('hidden');
            if (typeof playSynthSound === 'function') {
                playSynthSound(300, 600, 0.4, 'triangle');
            }
        }
    }
};

window.claimDailyReward = async function() {
    const overlay = document.getElementById('daily-reward-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
    }
    
    commanderProfile.stars = (commanderProfile.stars || 0) + 100;
    commanderProfile.lastDailyLogin = Date.now();
    saveProfile();
    
    syncHeaderAndPilotData();
    raiseToast("Daily Allowance claimed! +100 Stars 🌌", "🌌");
    if (typeof playSynthSound === 'function') {
        playSynthSound(800, 1200, 0.5, 'sine');
    }
};

function loadProfileAndLeaderboard() {
    const profString = localStorage.getItem('cosmic_profile');
    if (profString) {
        try {
            commanderProfile = { ...DEFAULT_PROFILE, ...JSON.parse(profString) };
        } catch(e) { console.error(e); }
    }
    const leadString = localStorage.getItem('cosmic_leaderboard');
    if (leadString) {
        try {
            leaderboardRecords = JSON.parse(leadString);
        } catch(e) { console.error(e); }
    } else {
        leaderboardRecords = [...DEFAULT_LEADERBOARD];
    }
}

// Quick trigger code to register a game outcome to profile / leaderboard
function registerMatchCompletion(winnerPilotName, winnerIdx, isSnakesLadders) {
    commanderProfile.gamesPlayed += 1;
    
    const isHumanWinner = isSnakesLadders
        ? (typeof slState !== 'undefined' && slState.playerTypes[winnerIdx] === 'human')
        : isHuman(winnerIdx);
        
    if (isHumanWinner) {
        commanderProfile.totalWins += 1;
        // Unlock Solar Core badge
        if (!commanderProfile.unlockedBadges.includes("Solar Core")) {
            commanderProfile.unlockedBadges.push("Solar Core");
        }
        if (isClashMode && !commanderProfile.unlockedBadges.includes("Clash Master")) {
            commanderProfile.unlockedBadges.push("Clash Master");
        }
    }

    // Star Economy Rewards
    let starReward = 0;
    let rewardReason = "";
    
    if (state && state.isMultiplayer) {
        if (isHumanWinner) {
            const activeSlots = getActivePlayerSlots(state.gameConfig);
            const activeCount = activeSlots.length;
            starReward = activeCount * 90; // Jackpot pays out 90 stars per active player
            rewardReason = "Online Match Victory!";
        }
    } else {
        // Offline modes
        if (isHumanWinner) {
            starReward = 20;
            rewardReason = "Simulation Victory!";
        } else {
            starReward = 5;
            rewardReason = "Consolation Reward";
        }
    }
    
    if (starReward > 0) {
        commanderProfile.stars = (commanderProfile.stars || 0) + starReward;
        raiseToast(`${rewardReason}: +${starReward} Stars 🌌`, "🌌");
    }
    
    // Add points to leaderboard dynamically and recalculate win rate
    let records = leaderboardRecords;
    const currentName = commanderProfile.commanderName;
    
    let found = records.find(r => r.name === currentName);
    if (found) {
        found.gamesPlayed = commanderProfile.gamesPlayed;
        found.totalWins = commanderProfile.totalWins;
        if (isHumanWinner) {
            found.rankPoints += 250;
        } else {
            found.rankPoints += 50; // Consolation reward
        }
        found.winRate = found.gamesPlayed > 0
            ? Math.round((found.totalWins / found.gamesPlayed) * 100) + "%"
            : "0%";
        found.species = commanderProfile.species;
    } else {
        const gPlay = commanderProfile.gamesPlayed;
        const gWins = commanderProfile.totalWins;
        records.push({
            rank: 0,
            name: currentName,
            gamesPlayed: gPlay,
            totalWins: gWins,
            winRate: gPlay > 0 ? Math.round((gWins / gPlay) * 100) + "%" : "0%",
            rankPoints: isHumanWinner ? 1250 : 1050,
            species: commanderProfile.species
        });
    }

    // Dynamic bot simulation updates to keep others competitive and alive
    records.forEach(r => {
        if (r.name !== currentName) {
            if (Math.random() < 0.45) {
                if (!r.gamesPlayed) { r.gamesPlayed = 40; r.totalWins = 25; }
                r.gamesPlayed += 1;
                if (Math.random() < 0.5) {
                    r.totalWins += 1;
                    r.rankPoints += Math.floor(Math.random() * 100) + 150;
                } else {
                    r.rankPoints += Math.floor(Math.random() * 40) + 10;
                }
                r.winRate = r.gamesPlayed > 0
                    ? Math.round((r.totalWins / r.gamesPlayed) * 100) + "%"
                    : "0%";
            }
        }
    });
    
    // sort records
    records.sort((a,b) => b.rankPoints - a.rankPoints);
    records.forEach((r, idx) => r.rank = idx + 1);
    
    leaderboardRecords = records;
    localStorage.setItem('cosmic_leaderboard', JSON.stringify(leaderboardRecords));
    renderLeaderboard();
    
    saveProfile();
    renderProfileView();
}

// More Fun tab controller
function renderMoreFunSection() {
    const container = document.getElementById('more-fun-content');
    if (!container) return;

    // Load personal bests from localStorage
    const dodgerBest = parseInt(localStorage.getItem('cosmic_dodger_high') || '0', 10).toLocaleString();
    const shooterBest = parseInt(localStorage.getItem('cosmic_shooter_high') || '0', 10).toLocaleString();

    container.innerHTML = `

        <div class="mini-challenge-card" style="border-color: var(--cyan); position: relative;">
            <div class="challenge-pill" style="background: var(--cyan);">FLIGHT RUN</div>
            <div style="position:absolute; top:12px; right:12px; background:rgba(0,229,255,0.12); border:1px solid rgba(0,229,255,0.3); border-radius:8px; padding:4px 10px; text-align:center; min-width:64px;">
                <div style="font-size:0.5rem; color:#94a3b8; letter-spacing:0.5px; font-weight:700;">BEST</div>
                <div id="dodger-card-best" style="font-size:1rem; font-weight:900; color:#00e5ff; font-family:'Nunito',sans-serif; line-height:1.1;">${dodgerBest}</div>
            </div>
            <h4 class="challenge-lbl">🛰️ NEBULA FLIGHT RUN</h4>
            <p class="challenge-body">Deploy retro propulsion thrusters! Swerve your UFO to dodge descending meteors and gather blazing energy stars. Beat your personal best!</p>
            <button class="action-btn mode-card-btn" onclick="openNebulaFlightRun()" style="background: linear-gradient(135deg, var(--cyan), var(--red)) !important; border-color: var(--cyan) !important;">LAUNCH FLIGHT</button>
        </div>

        <div class="mini-challenge-card" style="border-color: #38bdf8; background: linear-gradient(135deg, rgba(2,0,16,0.95), rgba(14,0,50,0.9)); position:relative;">
            <div class="challenge-pill" style="background: linear-gradient(135deg, #0ea5e9, #7c3aed); color:#fff;">NEW GAME</div>
            <div style="position:absolute; top:12px; right:12px; background:rgba(14,165,233,0.12); border:1px solid rgba(14,165,233,0.3); border-radius:8px; padding:4px 10px; text-align:center; min-width:64px;">
                <div style="font-size:0.5rem; color:#94a3b8; letter-spacing:0.5px; font-weight:700;">BEST</div>
                <div id="shooter-card-best" style="font-size:1rem; font-weight:900; color:#38bdf8; font-family:'Nunito',sans-serif; line-height:1.1;">${shooterBest}</div>
            </div>
            <h4 class="challenge-lbl" style="color:#7dd3fc;">🛸 STARSHIP LASER ASSAULT</h4>
            <p class="challenge-body" style="color:#bae6fd;">Command your starship's continuous laser beam to obliterate alien waves! Face Easy scouts, Medium drifters, Hard spiders — and survive the Boss mothership every 5 waves.</p>
            <button class="action-btn mode-card-btn" onclick="openStarshipShooter()" style="background: linear-gradient(135deg, #0ea5e9, #7c3aed) !important; border-color: #38bdf8 !important;">DEPLOY STARSHIP</button>
        </div>

        <div class="mini-challenge-card" style="border-color: #10b981; background: linear-gradient(135deg, rgba(2,0,16,0.95), rgba(0,30,15,0.9)); position:relative;">
            <div class="challenge-pill" style="background: var(--green);">MINI GAME</div>
            <h4 class="challenge-lbl" style="color:#34d399;">🛸 COMPACT MINI LUDO</h4>
            <p class="challenge-body" style="color:#a7f3d0;">Clash in a high-speed 11x11 galaxy sector with no power-ups. Quantum sensors indicate a significantly higher chance of rolling a 6!</p>
            <button class="action-btn mode-card-btn" onclick="openMiniLudo()" style="background: linear-gradient(135deg, #10b981, #059669) !important; border-color: #34d399 !important;">LAUNCH MINI MISSION</button>
        </div>

        <div class="mini-challenge-card" style="border-color: var(--kid-pink); background: linear-gradient(135deg, rgba(2,0,16,0.95), rgba(40,0,30,0.9)); position:relative;">
            <div class="challenge-pill" style="background: var(--kid-pink);">TUTORIAL</div>
            <h4 class="challenge-lbl" style="color:var(--kid-pink);">🛸 FLIGHT COCKPIT GUIDE</h4>
            <p class="challenge-body" style="color:#fbcfe8;">Master Ludo coordinates, board movement paths, and warp drives. Inspect the official starship cockpit telemetry manual before taking off.</p>
            <button class="action-btn mode-card-btn" onclick="window.openTutorialModal()" style="background: linear-gradient(135deg, var(--kid-pink), #ec4899) !important; border-color: var(--kid-pink) !important;">OPEN MANUAL</button>
        </div>

        <div class="quick-fact-card">
            <span class="fact-icon">🌟</span>
            <div>
                <h5 class="fact-title">Cosmic Flight Codes Facts</h5>
                <p class="fact-text" id="random-fact-field">Rolling a double Turn or hitting warp-speed portals speeds your mothership landing!</p>
            </div>
            <button class="setup-chip" onclick="cycleFact()" style="max-width: fit-content; align-self: flex-end;">Next Fact</button>
        </div>
    `;
}

const FACTS = [
    "Warp drive zones are safe territories in gravitational storms!",
    "Aliens roam orbits continuously to clear wandering operators.",
    "A dice roll of 6 enables launch protocol of dormant UFO crafts from space docks.",
    "Bot pilots calculate optimal trajectories with hard cognitive systems!"
];
let currentFactIdx = 0;

function cycleFact() {
    currentFactIdx = (currentFactIdx + 1) % FACTS.length;
    const fField = document.getElementById('random-fact-field');
    if (fField) {
        fField.innerText = FACTS[currentFactIdx];
    }
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 40, 0.25, 'sine');
    }
}

// Settings implementation
function renderSettingsView() {
    const speedSelect = document.getElementById('settings-flight-speed');
    if (speedSelect) {
        speedSelect.value = localStorage.getItem('cosmic_flight_speed') || 'medium';
    }
    
    const densitySlider = document.getElementById('settings-starfield-density');
    if (densitySlider) {
        densitySlider.value = localStorage.getItem('cosmic_star_density') || '50';
    }

    // Advanced Volume Controls
    const musicVol = localStorage.getItem('cosmic_music_volume') || '0.5';
    const musicSlider = document.getElementById('settings-music-volume');
    if (musicSlider) musicSlider.value = musicVol;
    const musicDisplay = document.getElementById('music-volume-display');
    if (musicDisplay) musicDisplay.innerText = Math.round(musicVol * 100) + '%';

    const sfxVol = localStorage.getItem('cosmic_sfx_volume') || '0.6';
    const sfxSlider = document.getElementById('settings-sfx-volume');
    if (sfxSlider) sfxSlider.value = sfxVol;
    const sfxDisplay = document.getElementById('sfx-volume-display');
    if (sfxDisplay) sfxDisplay.innerText = Math.round(sfxVol * 100) + '%';

    // Advanced Select Controls
    const diceMode = localStorage.getItem('cosmic_dice_mode') || '3d';
    const diceSelect = document.getElementById('settings-dice-mode');
    if (diceSelect) diceSelect.value = diceMode;

    const particleLevel = localStorage.getItem('cosmic_particle_level') || 'high';
    const particleSelect = document.getElementById('settings-particle-level');
    if (particleSelect) particleSelect.value = particleLevel;

    const wakeLockVal = localStorage.getItem('cosmic_wake_lock') || 'enabled';
    const wakeLockSelect = document.getElementById('settings-wake-lock');
    if (wakeLockSelect) wakeLockSelect.value = wakeLockVal;

    const langVal = localStorage.getItem('cosmic_language') || 'en';
    const langSelect = document.getElementById('settings-language');
    if (langSelect) langSelect.value = langVal;
}

window.updateAmbientVolume = function(val) {
    localStorage.setItem('cosmic_music_volume', val);
    const display = document.getElementById('music-volume-display');
    if (display) display.innerText = Math.round(val * 100) + '%';
    if (typeof window.setAmbientVolume === 'function') {
        window.setAmbientVolume(parseFloat(val));
    }
};

window.updateSFXVolume = function(val) {
    localStorage.setItem('cosmic_sfx_volume', val);
    const display = document.getElementById('sfx-volume-display');
    if (display) display.innerText = Math.round(val * 100) + '%';
    if (typeof window.setSFXVolume === 'function') {
        window.setSFXVolume(parseFloat(val));
    }
};

window.updateDiceMode = function(val) {
    localStorage.setItem('cosmic_dice_mode', val);
    raiseToast(`Dice mode updated to ${val === '3d' ? '3D Holographic' : '2D Classic'}!`, "🎲");
};

window.updateParticleLevel = function(val) {
    localStorage.setItem('cosmic_particle_level', val);
    raiseToast(`Particle rendering throttled to ${val.toUpperCase()}!`, "✨");
};

window.updateWakeLock = function(val) {
    localStorage.setItem('cosmic_wake_lock', val);
    if (val === 'enabled') {
        requestWakeLock();
        raiseToast("Device screen lock enabled!", "🔆");
    } else {
        releaseWakeLock();
        raiseToast("Screen timeout restored to default OS behavior.", "💤");
    }
};

window.updateLanguage = function(val) {
    localStorage.setItem('cosmic_language', val);
    raiseToast(`Interface language protocol set to ${val.toUpperCase()}!`, "🌐");
};

function updateFlightSpeed(val) {
    localStorage.setItem('cosmic_flight_speed', val);
    raiseToast(`Game flight speed updated to ${val.toUpperCase()}!`, "🛸");
}

function updateStarfieldDensity(val) {
    localStorage.setItem('cosmic_star_density', val);
    if (typeof generateStars === 'function') {
        generateStars();
    }
}

function resetSettings() {
    localStorage.clear();
    commanderProfile = { ...DEFAULT_PROFILE };
    leaderboardRecords = [...DEFAULT_LEADERBOARD];
    localStorage.setItem('cosmic_leaderboard', JSON.stringify(DEFAULT_LEADERBOARD));
    saveProfile();

    // Set default local settings
    localStorage.setItem('cosmic_music_volume', '0.5');
    localStorage.setItem('cosmic_sfx_volume', '0.6');
    localStorage.setItem('cosmic_dice_mode', '3d');
    localStorage.setItem('cosmic_particle_level', 'high');
    localStorage.setItem('cosmic_wake_lock', 'enabled');
    localStorage.setItem('cosmic_language', 'en');
    localStorage.setItem('cosmic_flight_speed', 'medium');
    localStorage.setItem('cosmic_star_density', '50');

    // Trigger updates
    if (typeof window.setAmbientVolume === 'function') window.setAmbientVolume(0.5);
    if (typeof window.setSFXVolume === 'function') window.setSFXVolume(0.6);
    if (typeof generateStars === 'function') generateStars();

    renderLeaderboard();
    renderProfileView();
    renderSettingsView();
    raiseToast("Console system wiped to factory defaults!", "🔄");
}

// Auth change listener to handle automatic logins / reloads on redirect
window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.Multiplayer && window.Multiplayer.auth) {
            window.Multiplayer.auth.onAuthStateChanged(async (user) => {
                if (user && (!commanderProfile || !commanderProfile.isRegistered)) {
                    // Authenticated, but local storage doesn't have it (e.g. fresh redirect login)
                    console.log("Firebase user detected on reload, fetching profile...");
                    try {
                        const profileData = await window.Multiplayer.getProfileFromFirestore(user.uid);
                        if (profileData) {
                            commanderProfile.commanderName = profileData.name || "COSMIC CADET";
                            commanderProfile.species = profileData.species || "Terran (Human)";
                            commanderProfile.gamesPlayed = profileData.gamesPlayed || 0;
                            commanderProfile.totalWins = profileData.totalWins || 0;
                            commanderProfile.unlockedBadges = profileData.unlockedBadges || ["First Flight"];
                            commanderProfile.stars = profileData.stars !== undefined ? profileData.stars : 1000;
                            commanderProfile.lastDailyLogin = profileData.lastDailyLogin || 0;
                            commanderProfile.unlockedSkins = profileData.unlockedSkins || ["classic"];
                            commanderProfile.equippedSkin = profileData.equippedSkin || "classic";
                            commanderProfile.isRegistered = true;
                            
                            saveProfile();
                            syncHeaderAndPilotData();
                            renderProfileView();
                            
                            // Auto-navigate to home if currently on login screen
                            const currentView = document.querySelector('.view:not(.hidden)');
                            if (currentView && currentView.id === 'login-screen') {
                                navigateTo('home-screen');
                                if (typeof checkDailyLogin === 'function') {
                                    checkDailyLogin();
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Auth state change profile load error:", e);
                    }
                }
            });
        }
    }, 1500);
});

// Premium Cosmic Pack logic
window.buyPremiumCosmicPack = function() {
    if (!commanderProfile.unlockedSkins) {
        commanderProfile.unlockedSkins = ["classic"];
    }

    const premiumSkins = ["dragon", "stealth", "crystal", "mech", "pumpkin", "candy", "dino"];
    const allAlreadyUnlocked = premiumSkins.every(skinId => commanderProfile.unlockedSkins.includes(skinId));

    if (allAlreadyUnlocked) {
        raiseToast("You have already unlocked all premium pack skins!", "👑");
        return;
    }

    const cost = 8000;
    const stars = commanderProfile.stars || 0;

    if (stars >= cost) {
        commanderProfile.stars -= cost;
        premiumSkins.forEach(skinId => {
            if (!commanderProfile.unlockedSkins.includes(skinId)) {
                commanderProfile.unlockedSkins.push(skinId);
            }
        });
        commanderProfile.equippedSkin = "dragon";
        
        saveProfile();
        syncHeaderAndPilotData();
        renderSkinsShop();
        
        if (typeof playSynthSound === 'function') {
            playSynthSound(523.25, 120, 0.1, 'sine');
            setTimeout(() => {
                playSynthSound(659.25, 120, 0.1, 'sine');
                setTimeout(() => {
                    playSynthSound(783.99, 200, 0.15, 'sine');
                }, 100);
            }, 100);
        }
        
        if (typeof playAudioFile === 'function') {
            playAudioFile('purchase_success.mp3');
        }
        
        raiseToast("Premium Cosmic Pack unlocked! All 7 expansion skins are now accessible.", "👑");
    } else {
        if (typeof playAudioFile === 'function') {
            playAudioFile('purchase_fail.mp3');
        }
        raiseToast("Insufficient stars! Complete missions or visit Star Store to buy stars.", "❌");
    }
};

// Cockpit Guide Tutorial modal
window.openTutorialModal = function() {
    let modal = document.getElementById('tutorial-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'tutorial-modal';
    modal.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(2, 0, 20, 0.95);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999;
        opacity: 0; transition: opacity 0.3s ease;
        font-family: 'Orbitron', 'Nunito', sans-serif;
        padding: 16px; box-sizing: border-box;
    `;
    modal.innerHTML = `
        <div style="
            background: linear-gradient(160deg, #0d0525 0%, #050a1a 60%, #0a0220 100%);
            border: 2px solid var(--kid-pink);
            box-shadow: 0 0 50px rgba(255,107,157,0.3);
            border-radius: 20px;
            width: 100%; max-width: 480px;
            max-height: 90vh; overflow-y: auto;
            padding: 24px;
            box-sizing: border-box;
            position: relative;
            text-align: center;
        ">
            <button type="button" onclick="document.getElementById('tutorial-modal').remove()" style="
                position: absolute; top: 16px; right: 16px;
                background: none; border: none; font-size: 1.5rem; color: #ffffff; cursor: pointer;
            ">✕</button>
            <h2 style="margin: 0 0 8px; font-size: 1.2rem; color: var(--kid-pink); font-weight: 900; letter-spacing: 1.5px;">PILOT COCKPIT MANUAL</h2>
            <p style="margin: 0 0 16px; font-size: 0.7rem; color: #94a3b8; font-family: 'Nunito', sans-serif;">Review coordinate maps, warp sectors, and safe zones.</p>
            <img src="images/generated/promo/art_tutorial_board.png" style="width: 100%; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); object-fit: contain;" />
            <button type="button" class="action-btn" onclick="document.getElementById('tutorial-modal').remove()" style="
                background: linear-gradient(135deg, var(--kid-pink), #ec4899) !important;
                border-color: var(--kid-pink) !important; width: 100%;
            ">ACKNOWLEDGED</button>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.style.opacity = '1';
    }, 50);
};
