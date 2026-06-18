let lobbyConfig = getDefaultGameConfig();
lobbyConfig.ufoCount = 4; // ALWAYS 4!
lobbyConfig.humanColorIndex = null; // No default color pre-selected
loadLobbyConfigFromStorage();

function saveLobbyConfigToStorage() {
    if (typeof localStorage !== 'undefined' && lobbyConfig) {
        localStorage.setItem('cosmic_lobby_config', JSON.stringify({
            playerCount: lobbyConfig.playerCount,
            playerTypes: lobbyConfig.playerTypes,
            botDifficulty: lobbyConfig.botDifficulty,
            ufoCount: 4,
            humanColorIndex: lobbyConfig.humanColorIndex
        }));
    }
}

function loadLobbyConfigFromStorage() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('cosmic_lobby_config');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.playerCount !== undefined) {
                        lobbyConfig.playerCount = parsed.playerCount;
                    }
                    if (Array.isArray(parsed.playerTypes)) {
                        lobbyConfig.playerTypes = [...parsed.playerTypes];
                    }
                    if (parsed.botDifficulty !== undefined) {
                        lobbyConfig.botDifficulty = parsed.botDifficulty;
                    }
                    lobbyConfig.ufoCount = 4;
                    if (parsed.humanColorIndex !== undefined) {
                        lobbyConfig.humanColorIndex = parsed.humanColorIndex;
                    }
                }
            } catch (e) {
                console.error("Failed parsing saved lobby config", e);
            }
        }
    }

    // Safety validation on loaded configurations to ensure consistency
    if (!Array.isArray(lobbyConfig.playerTypes) || lobbyConfig.playerTypes.length !== 4) {
        lobbyConfig.playerTypes = ['human', 'bot', 'bot', 'bot'];
    }
    const slots = getActivePlayerSlots(lobbyConfig);
    const activeHumans = slots.filter(i => lobbyConfig.playerTypes[i] === 'human');
    if (activeHumans.length === 0) {
        lobbyConfig.playerTypes[slots[0]] = 'human';
        lobbyConfig.humanColorIndex = slots[0];
    } else if (activeHumans.length === 1) {
        lobbyConfig.humanColorIndex = activeHumans[0];
    } else {
        lobbyConfig.humanColorIndex = null;
    }
}

function openSetupModal() {
    const modal = document.getElementById('setup-modal');
    if (modal) modal.classList.add('active');
    renderSetupUI();
}

function closeSetupModal() {
    const modal = document.getElementById('setup-modal');
    if (modal) modal.classList.remove('active');
}

function setLobbyPlayerCount(count, event) {
    if (event) event.stopPropagation();
    lobbyConfig.playerCount = count;
    
    // Ensure human's slot/color is part of the active slots for the new count
    const slots = getActivePlayerSlots(lobbyConfig);
    const activeHumans = slots.filter(i => lobbyConfig.playerTypes[i] === 'human');
    
    if (activeHumans.length === 0) {
        lobbyConfig.playerTypes[slots[0]] = 'human';
        lobbyConfig.humanColorIndex = slots[0];
    } else if (activeHumans.length === 1) {
        lobbyConfig.humanColorIndex = activeHumans[0];
    } else {
        lobbyConfig.humanColorIndex = null;
    }
    
    syncPlayerSlotsWithSelectedColor();

    saveLobbyConfigToStorage();
    renderSetupUI();
}

function setLobbyPlayerType(playerIdx, type, event) {
    if (event) event.stopPropagation();
    const slots = getActivePlayerSlots(lobbyConfig);

    if (type === 'human') {
        lobbyConfig.playerTypes[playerIdx] = 'human';
    } else {
        // Ensure there is still at least 1 human in the active slots
        const humanSlots = slots.filter(idx => lobbyConfig.playerTypes[idx] === 'human');
        if (humanSlots.length === 1 && humanSlots[0] === playerIdx) {
            raiseToast('All bots are not allowed! At least one pilot must be a human operator.', '⚠️');
            return;
        }
        lobbyConfig.playerTypes[playerIdx] = 'bot';
    }

    const activeHumans = slots.filter(idx => lobbyConfig.playerTypes[idx] === 'human');
    if (activeHumans.length === 1) {
        lobbyConfig.humanColorIndex = activeHumans[0];
    } else {
        lobbyConfig.humanColorIndex = null;
    }

    syncPlayerSlotsWithSelectedColor();
    saveLobbyConfigToStorage();
    renderSetupUI();
}

function setLobbyBotDifficulty(diff, event) {
    if (event) event.stopPropagation();
    lobbyConfig.botDifficulty = diff;
    saveLobbyConfigToStorage();
    renderSetupUI();
}

function renderSetupUI() {
    document.querySelectorAll('#player-count-options .setup-chip').forEach(btn => {
        btn.classList.toggle('selected', parseInt(btn.dataset.count, 10) === lobbyConfig.playerCount);
    });

    document.querySelectorAll('#bot-difficulty-options .setup-chip').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.diff === lobbyConfig.botDifficulty);
    });

    const diffSection = document.getElementById('bot-difficulty-section');
    const slots = getActivePlayerSlots(lobbyConfig);
    const hasBot = slots.some(i => lobbyConfig.playerTypes[i] === 'bot');
    if (diffSection) {
        diffSection.style.display = hasBot ? '' : 'none';
    }

    const resumeBtn = document.getElementById('setup-resume-btn');
    if (resumeBtn) {
        if (state && state.gameConfig && state.gameConfig.gameStarted) {
            resumeBtn.style.display = 'block';
        } else {
            resumeBtn.style.display = 'none';
        }
    }

    const resumePrevBtn = document.getElementById('setup-resume-previous-btn');
    if (resumePrevBtn) {
        const hasSaved = typeof loadGameStateFromLocalStorage === 'function' && loadGameStateFromLocalStorage() !== null;
        const currentStarted = state && state.gameConfig && state.gameConfig.gameStarted;
        if (hasSaved && !currentStarted) {
            resumePrevBtn.style.display = 'block';
        } else {
            resumePrevBtn.style.display = 'none';
        }
    }

    const container = document.getElementById('player-slot-config');
    if (!container) return;

    // Colored UFO emojis per slot
    const slotUFOs = ['🟢🛸', '🟡🛸', '🔴🛸', '🔵🛸'];

    let html = slots.map(playerIdx => {
        const p = players[playerIdx];
        const isHuman = lobbyConfig.playerTypes[playerIdx] === 'human';
        // Name input: editable only for humans
        const inputDisabled = isHuman ? '' : 'disabled';
        const inputOpacity = isHuman ? '' : 'opacity:0.35; cursor:not-allowed;';
        return `
            <div class="setup-slot-row ${p.color}-slot" onclick="toggleSlotPilotType(${playerIdx}, event)">
                <div class="setup-slot-identity">
                    <span class="setup-slot-char" style="font-size:1.3rem; line-height:1;">${slotUFOs[playerIdx]}</span>
                    <input type="text" class="setup-slot-input" value="${p.name}"
                        oninput="updatePlayerName(${playerIdx}, this.value)"
                        onfocus="event.stopPropagation()"
                        maxLength="14"
                        placeholder="Enter Name"
                        ${inputDisabled}
                        style="${inputOpacity}"
                    />
                </div>
                <div class="setup-type-toggle">
                    <button type="button" class="setup-chip ${isHuman ? 'selected' : ''}"
                        onclick="setLobbyPlayerType(${playerIdx}, 'human', event)">👤</button>
                    <button type="button" class="setup-chip ${!isHuman ? 'selected' : ''}"
                        onclick="setLobbyPlayerType(${playerIdx}, 'bot', event)">🤖</button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    renderUFODotsSelector();
    renderChooseColorSection();
}

function renderUFODotsSelector() {
    const dotsContainer = document.getElementById('ufo-dots-selector');
    const displayLabel = document.getElementById('ufo-count-display');
    if (!dotsContainer || !displayLabel) return;

    dotsContainer.innerHTML = '';
    const currentCount = lobbyConfig.ufoCount || 2;

    for (let i = 1; i <= 5; i++) {
        const dot = document.createElement('div');
        dot.className = `ufo-dot ${i <= currentCount ? 'filled' : 'empty'}`;
        
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            let newCount = i;
            if (newCount < 2) newCount = 2; // Minimum is 2
            lobbyConfig.ufoCount = newCount;
            saveLobbyConfigToStorage();
            renderUFODotsSelector();
            
            if (typeof playSynthSound === 'function') {
                playSynthSound(500 + i * 50, 80, 0.3, 'sine');
            }
        });

        dotsContainer.appendChild(dot);
    }

    displayLabel.textContent = `${currentCount} UFOs per pilot`;
}

function renderChooseColorSection() {
    const section = document.getElementById('choose-color-section');
    const grid = document.getElementById('color-swatches-grid');
    if (!section || !grid) return;

    const slots = getActivePlayerSlots(lobbyConfig);
    const humanPilots = slots.filter(i => lobbyConfig.playerTypes[i] === 'human');

    if (humanPilots.length === 1) {
        section.style.display = 'block';
        grid.innerHTML = '';

        const colors = [
            { idx: 0, name: 'GREEN', char: '🟢', value: 'var(--green, #00bc46)' },
            { idx: 1, name: 'YELLOW', char: '🟡', value: 'var(--yellow, #dca300)' },
            { idx: 2, name: 'RED', char: '🔴', value: 'var(--red, #cc0033)' },
            { idx: 3, name: 'BLUE', char: '🔵', value: 'var(--blue, #0077e6)' }
        ];

        const isPulse = (lobbyConfig.humanColorIndex === null || lobbyConfig.humanColorIndex === undefined);

        colors.forEach(col => {
            const wrapper = document.createElement('div');
            wrapper.className = 'color-swatch-wrapper';

            const swatch = document.createElement('div');
            swatch.className = `color-swatch ${isPulse ? 'color-swatch-pulse' : ''}`;
            swatch.style.backgroundColor = col.value;
            swatch.style.borderColor = (lobbyConfig.humanColorIndex === col.idx) ? '#ffffff' : 'rgba(255,255,255,0.2)';
            
            if (lobbyConfig.humanColorIndex === col.idx) {
                swatch.classList.add('selected');
                swatch.classList.remove('color-swatch-pulse');
                swatch.innerHTML = '🛸';
            } else {
                swatch.textContent = col.char;
            }

            const label = document.createElement('span');
            label.className = 'color-swatch-label';
            label.textContent = col.name;

            wrapper.appendChild(swatch);
            wrapper.appendChild(label);

            wrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                lobbyConfig.humanColorIndex = col.idx;
                syncPlayerSlotsWithSelectedColor();
                saveLobbyConfigToStorage();
                
                swatch.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    swatch.style.transform = '';
                    renderSetupUI();
                }, 150);

                if (typeof playSynthSound === 'function') {
                    playSynthSound(600, 120, 0.4, 'triangle');
                }
            });

            grid.appendChild(wrapper);
        });
    } else {
        section.style.display = 'none';
    }
}

function randomizeTeams(event) {
    if (event) event.stopPropagation();
    const slots = getActivePlayerSlots(lobbyConfig);
    
    // Choose exactly 1 slot at random to be the human pilot
    const targetHumanIndex = slots[Math.floor(Math.random() * slots.length)];
    lobbyConfig.humanColorIndex = targetHumanIndex;
    syncPlayerSlotsWithSelectedColor();

    saveLobbyConfigToStorage();
    renderSetupUI();

    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 100, 0.45, 'sine');
    }
    raiseToast('Crews re-assigned at random!', '🔀');
}

function updatePlayerName(playerIdx, newName) {
    const sanitized = newName.toUpperCase();
    players[playerIdx].name = sanitized;

    // Update commanderProfile if this is a human player
    if (lobbyConfig && lobbyConfig.playerTypes[playerIdx] === 'human') {
        if (typeof commanderProfile !== 'undefined') {
            commanderProfile.commanderName = sanitized.trim() || "COSMIC CADET";
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('cosmic_profile', JSON.stringify(commanderProfile));
            }
        }
    }
}

function validateLobbyConfig() {
    const slots = getActivePlayerSlots(lobbyConfig);
    const humans = slots.filter(i => lobbyConfig.playerTypes[i] === 'human').length;
    if (humans < 1) {
        raiseToast('Assign at least one human pilot!', '⚠️');
        return false;
    }

    if (humans === 1) {
        if (lobbyConfig.humanColorIndex === null || lobbyConfig.humanColorIndex === undefined) {
            raiseToast('Assign a color first!', '⚠️');
            const swatches = document.querySelectorAll('.color-swatch');
            swatches.forEach(s => {
                s.classList.add('color-swatch-pulse');
                s.style.transform = 'scale(1.1)';
            });
            setTimeout(() => {
                swatches.forEach(s => s.style.transform = '');
            }, 300);
            return false;
        }
    }

    // Validate player names (empty string after trim is rejected with a warning)
    for (const playerIdx of slots) {
        const pName = players[playerIdx].name || "";
        if (!pName.trim()) {
            raiseToast(`Please enter a valid callsign for Pilot ${playerIdx + 1}!`, '⚠️');
            return false;
        }
    }
    return true;
}

function startGameFromSetup() {
    if (!validateLobbyConfig()) return;

    state.gameConfig = {
        mode: lobbyConfig.mode || 'passAndPlay',
        playerCount: lobbyConfig.playerCount,
        playerTypes: [...lobbyConfig.playerTypes],
        botDifficulty: lobbyConfig.botDifficulty,
        ufoCount: 4,
        humanColorIndex: lobbyConfig.humanColorIndex,
        gameStarted: true
    };

    saveLobbyConfigToStorage();
    closeSetupModal();

    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.remove('game-hidden');

    beginMatch();

    if (typeof navigateTo === 'function') {
        navigateTo('game-screen');
    }
}

function syncPlayerSlotsWithSelectedColor() {
    const H = lobbyConfig.humanColorIndex;
    const slots = getActivePlayerSlots(lobbyConfig);
    const overallHumans = [0, 1, 2, 3].filter(idx => lobbyConfig.playerTypes[idx] === 'human');

    if (H !== null && H !== undefined && slots.includes(H)) {
        if (overallHumans.length <= 1) {
            // Only one human, so force that slot to be the human, and make all others bots
            for (let i = 0; i < 4; i++) {
                if (i === H) {
                    lobbyConfig.playerTypes[i] = 'human';
                } else {
                    lobbyConfig.playerTypes[i] = 'bot';
                }
            }
        }
    }

    const defaultNames = ['PILOT GREEN', 'PILOT YELLOW', 'PILOT RED', 'PILOT BLUE'];

    for (let i = 0; i < 4; i++) {
        if (lobbyConfig.playerTypes[i] === 'human') {
            const currentName = players[i].name || '';
            if (!currentName || defaultNames.includes(currentName.trim().toUpperCase()) || currentName === 'BOT ' + (i + 1)) {
                if (typeof commanderProfile !== 'undefined' && commanderProfile.commanderName) {
                    players[i].name = commanderProfile.commanderName.trim().toUpperCase() || defaultNames[i];
                } else {
                    players[i].name = defaultNames[i];
                }
            }
        } else {
            players[i].name = defaultNames[i];
        }
    }
}

function adjustPlayerColorsAndSlots() {
    const isMini = (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') || (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.mode === 'miniLudo');
    const originalPlayers = [
        { id: 0, color: 'green', name: 'PILOT GREEN', startIdx: isMini ? 1 : 1, homeCells: isMini ? [[5,1], [5,2], [5,3], [5,4]] : [[7,1], [7,2], [7,3], [7,4], [7,5]], baseCoords: isMini ? [] : [[2,2], [2,3], [3,2], [3,3], [4,2]] },
        { id: 1, color: 'yellow', name: 'PILOT YELLOW', startIdx: isMini ? 10 : 14, homeCells: isMini ? [[1,5], [2,5], [3,5], [4,5]] : [[1,7], [2,7], [3,7], [4,7], [5,7]], baseCoords: isMini ? [] : [[2,11], [2,12], [3,11], [3,12], [4,11]] },
        { id: 2, color: 'red', name: 'PILOT RED', startIdx: isMini ? 28 : 40, homeCells: isMini ? [[9,5], [8,5], [7,5], [6,5]] : [[13,7], [12,7], [11,7], [10,7], [9,7]], baseCoords: isMini ? [] : [[11,2], [11,3], [12,2], [12,3], [13,2]] },
        { id: 3, color: 'blue', name: 'PILOT BLUE', startIdx: isMini ? 19 : 27, homeCells: isMini ? [[5,9], [5,8], [5,7], [5,6]] : [[7,13], [7,12], [7,11], [7,10], [7,9]], baseCoords: isMini ? [] : [[11,11], [11,12], [12,11], [12,12], [13,11]] }
    ];

    const defaultNames = ['PILOT GREEN', 'PILOT YELLOW', 'PILOT RED', 'PILOT BLUE'];

    const savedNames = players.map(p => p.name);

    for (let i = 0; i < 4; i++) {
        players[i].color = originalPlayers[i].color;
        players[i].startIdx = originalPlayers[i].startIdx;
        players[i].homeCells = originalPlayers[i].homeCells;
        players[i].baseCoords = originalPlayers[i].baseCoords;

        if (lobbyConfig.playerTypes[i] === 'bot') {
            players[i].name = defaultNames[i];
        } else {
            const saved = savedNames[i] ? savedNames[i].trim() : '';
            if (saved && !defaultNames.includes(saved.toUpperCase())) {
                players[i].name = saved;
            } else if (typeof commanderProfile !== 'undefined' && commanderProfile.commanderName) {
                players[i].name = commanderProfile.commanderName.trim().toUpperCase() || defaultNames[i];
            } else {
                players[i].name = defaultNames[i];
            }
        }
    }

    // Rebuild track path maps for updated starts/homes
    if (typeof initPathMaps === 'function') {
        initPathMaps();
    }
}

function beginMatch() {
    adjustPlayerColorsAndSlots();
    state = createFreshGameState();
    if (typeof initPathMaps === 'function') {
        initPathMaps();
    }

    if (state.isMultiplayer) {
        commanderProfile.stars = Math.max(0, (commanderProfile.stars || 0) - 100);
        saveProfile();
        syncHeaderAndPilotData();
        raiseToast("Online Entry fee paid: -100 Stars 🌌", "🌌");
    }

    // Clear dynamic dice history log elements from the previous game session
    if (typeof document !== 'undefined') {
        const logElem = document.getElementById('dice-history-log');
        if (logElem) {
            logElem.remove();
        }
    }

    if (typeof initializeRandomPortals === 'function') {
        initializeRandomPortals();
    }

    buildBoardDOM();
    initPlayerCharacters();
    renderPawns();
    applyPlayerSlotVisibility();
    updatePlayerTypeBadges();
    resetMatchControls();
    updateTurnUIVisually();

    // Quick Play Tip Banner
    if (state.gameConfig && state.gameConfig.mode === 'quick') {
        const gameWrapper = document.querySelector('.game-wrapper');
        if (gameWrapper) {
            // Remove old message if it exists (e.g. from a previous game)
            const oldMsg = document.getElementById('quick-play-msg');
            if (oldMsg) oldMsg.remove();

            const msg = document.createElement('div');
            msg.id = 'quick-play-msg';
            msg.innerHTML = `
                <span style="font-size:1.1rem;">🎲</span>
                <span>QUICK PLAY &nbsp;·&nbsp; Roll a <strong>6</strong> — All UFOs inside home launch automatically!</span>
                <span style="font-size:1.1rem;">🛸</span>
            `;
            msg.style.cssText = [
                'position:fixed',
                'bottom:52px',            // sits just above footer controls
                'left:0',
                'width:100vw',
                'text-align:center',
                'background:linear-gradient(90deg, rgba(250,204,21,0.92) 0%, rgba(251,146,60,0.95) 100%)',
                'color:#1a0a00',
                'font-weight:900',
                'font-size:0.72rem',
                'font-family:\'Nunito\',sans-serif',
                'letter-spacing:0.4px',
                'padding:8px 12px',
                'z-index:9000',
                'box-shadow:0 -2px 16px rgba(250,204,21,0.55)',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'gap:8px',
                'pointer-events:none',
                'animation:quickPlayTipIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
                'border-top:2px solid rgba(251,146,60,0.7)',
            ].join(';');

            // Inject keyframe if not already present
            if (!document.getElementById('quick-play-tip-anim')) {
                const style = document.createElement('style');
                style.id = 'quick-play-tip-anim';
                style.textContent = `
                    @keyframes quickPlayTipIn {
                        from { opacity:0; transform:translateY(16px); }
                        to   { opacity:1; transform:translateY(0); }
                    }
                    @keyframes quickPlayTipOut {
                        from { opacity:1; transform:translateY(0); }
                        to   { opacity:0; transform:translateY(16px); }
                    }
                `;
                document.head.appendChild(style);
            }

            gameWrapper.appendChild(msg);

            // Auto-dismiss after 9 seconds with fade-out
            setTimeout(() => {
                if (msg && msg.parentNode) {
                    msg.style.animation = 'quickPlayTipOut 0.5s ease forwards';
                    setTimeout(() => { if (msg.parentNode) msg.remove(); }, 500);
                }
            }, 9000);
        }
    }

    for (let i = 0; i < 4; i++) {
        displayDiceDots(i, 1);
    }

    const slots = getActivePlayerSlots();
    const humanCount = slots.filter(i => isHuman(i)).length;
    const botCount = slots.length - humanCount;
    raiseToast(
        `Mission launched! ${slots.length} pilots — ${humanCount} human, ${botCount} bot.`,
        '🚀'
    );

    scheduleBotTurn(900);
}

function returnToSetup() {
    if (botTurnTimer) clearTimeout(botTurnTimer);

    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.classList.remove('active');

    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.add('game-hidden');

    if (typeof state !== 'undefined' && state.gameConfig) {
        state.gameConfig.gameStarted = false;
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('ludo_game_state_save');
    }

    openSetupModal();
}

function cycleCrewSize(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        return;
    }
    const current = lobbyConfig.playerCount;
    const next = current === 2 ? 3 : (current === 3 ? 4 : 2);
    setLobbyPlayerCount(next);
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 100, 0.4, 'sine');
    }
}

function cycleBotIntelligence(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        return;
    }
    const current = lobbyConfig.botDifficulty;
    const next = current === 'easy' ? 'medium' : (current === 'medium' ? 'hard' : 'easy');
    setLobbyBotDifficulty(next);
    if (typeof playSynthSound === 'function') {
        playSynthSound(450, 100, 0.4, 'sine');
    }
}

// Keep a simple fallback for randomizeTeams if called anywhere (remove duplicate, now handled by single function)

function toggleSlotPilotType(playerIdx, event) {
    if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'BUTTON' ||
        event.target.closest('button') ||
        event.target.closest('input')
    ) {
        return;
    }
    const currentType = lobbyConfig.playerTypes[playerIdx];
    const nextType = currentType === 'human' ? 'bot' : 'human';
    
    if (nextType === 'bot') {
        const slots = getActivePlayerSlots(lobbyConfig);
        const humanSlots = slots.filter(idx => lobbyConfig.playerTypes[idx] === 'human');
        if (humanSlots.length === 1 && humanSlots[0] === playerIdx) {
            raiseToast('All bots are not allowed! At least one pilot must be a human operator.', '⚠️');
            return;
        }
    }

    setLobbyPlayerType(playerIdx, nextType);
    if (typeof playSynthSound === 'function') {
        playSynthSound(400, 80, 0.4, 'sine');
    }
}

function resumeActiveGame() {
    closeSetupModal();
    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.remove('game-hidden');
    
    // Resume bot scheduling if the active player is a AI/bot pilot
    if (isBot(state.activePlayer)) {
        scheduleBotTurn(600);
    }
}

function playAgainSameConfig() {
    const winModal = document.getElementById('win-modal');
    if (winModal) winModal.classList.remove('active');

    lobbyConfig = {
        playerCount: state.gameConfig.playerCount,
        playerTypes: [...state.gameConfig.playerTypes],
        botDifficulty: state.gameConfig.botDifficulty,
        ufoCount: 4,
        humanColorIndex: lobbyConfig.humanColorIndex,
        gameStarted: false
    };

    if (typeof initializeRandomPortals === 'function') {
        initializeRandomPortals();
    }

    beginMatch();
}

function initSetupScreen() {
    lobbyConfig = getDefaultGameConfig();
    lobbyConfig.ufoCount = 4;
    lobbyConfig.humanColorIndex = 0; // Default GREEN
    loadLobbyConfigFromStorage();

    if (lobbyConfig.humanColorIndex === null || lobbyConfig.humanColorIndex === undefined) {
        lobbyConfig.humanColorIndex = 0;
    }

    // Default playerTypes synchronization
    syncPlayerSlotsWithSelectedColor();

    // Sync first human user name from active commander profile
    if (typeof commanderProfile !== 'undefined' && commanderProfile.commanderName) {
        const slots = getActivePlayerSlots(lobbyConfig);
        const firstHuman = slots.find(i => lobbyConfig.playerTypes[i] === 'human');
        if (firstHuman !== undefined && players[firstHuman]) {
            players[firstHuman].name = commanderProfile.commanderName;
        }
    }

    renderSetupUI();
    openSetupModal();

    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.add('game-hidden');
}

window.resumeSavedGame = function() {
    const saved = typeof loadGameStateFromLocalStorage === 'function' ? loadGameStateFromLocalStorage() : null;
    if (!saved) {
        if (typeof raiseToast === 'function') {
            raiseToast("No saved mission found!", "⚠️");
        }
        return;
    }
    
    // Assign to state to propagate updates through defined setters and reset previous timers
    state = saved;
    
    // Force rebuild layout based on the loaded configuration
    adjustPlayerColorsAndSlots();
    buildBoardDOM();
    initPlayerCharacters();
    renderPawns();
    applyPlayerSlotVisibility();
    updatePlayerTypeBadges();
    
    // Sync buttons
    resetMatchControls();
    
    // Position dice face dots correctly based on resumed lastRoll
    if (state.lastRoll > 0) {
        for (let i = 0; i < 4; i++) {
            if (typeof displayDiceDots === 'function') {
                displayDiceDots(i, i === state.activePlayer ? state.lastRoll : 1);
            }
        }
    }
    
    updateTurnUIVisually();
    
    closeSetupModal();
    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.remove('game-hidden');
    
    if (typeof raiseToast === 'function') {
        raiseToast("Cosmic flight path resumed!", "🛰️");
    }
    
    // Resume bot scheduling if active player is a bot pilot
    if (isBot(state.activePlayer)) {
        scheduleBotTurn(600);
    }
};
