// Player slot presets by crew size (standard Ludo corners)
const PLAYER_SLOT_PRESETS = {
    1: [0, 1, 2, 3], // 1 Human player vs 3 Bots
    2: [0, 2],
    3: [0, 1, 2],
    4: [0, 1, 2, 3]
};

function getDefaultGameConfig() {
    return {
        mode: 'passAndPlay',
        playerCount: 4,
        playerTypes: ['human', 'human', 'bot', 'bot'],
        botDifficulty: 'medium',
        humanColorIndex: 0,
        ufoCount: 4,
        gameStarted: false
    };
}

function getActivePlayerSlots(config) {
    const cfg = config || (typeof state !== 'undefined' ? state.gameConfig : null) || (typeof lobbyConfig !== 'undefined' ? lobbyConfig : null) || getDefaultGameConfig();
    const count = cfg ? cfg.playerCount : 4;
    
    const supportedCounts = [1, 2, 3, 4];
    if (!supportedCounts.includes(count)) {
        console.warn(`Warning: Unsupported player count ${count} passed. Falling back to 4-player mode.`);
    }

    // Determine the human slot index
    const H = (cfg && cfg.humanColorIndex !== null && cfg.humanColorIndex !== undefined) ? cfg.humanColorIndex : null;

    if (H !== null && H >= 0 && H <= 3) {
        if (count === 4 || count === 1) {
            return [0, 1, 2, 3];
        } else if (count === 3) {
            if (H === 0) return [0, 1, 2];
            if (H === 1) return [1, 2, 3];
            if (H === 2) return [0, 2, 3];
            if (H === 3) return [0, 1, 3];
        } else if (count === 2) {
            if (H === 0 || H === 2) return [0, 2];
            if (H === 1 || H === 3) return [1, 3];
        }
    }

    if (cfg && cfg.playerCount === 1 && cfg.playerTypes) {
        const humanIdx = (H !== null && H >= 0 && H <= 3) ? H : 0;
        for (let i = 0; i < 4; i++) {
            cfg.playerTypes[i] = (i === humanIdx) ? 'human' : 'bot';
        }
    }

    return PLAYER_SLOT_PRESETS[count] || PLAYER_SLOT_PRESETS[4];
}

function isPlayerInGame(playerIdx, config) {
    return getActivePlayerSlots(config).includes(playerIdx);
}

function isBot(playerIdx) {
    if (typeof state === 'undefined') return false;
    return state.gameConfig?.playerTypes?.[playerIdx] === 'bot';
}

function isHuman(playerIdx) {
    if (typeof state === 'undefined') return false;
    return state.gameConfig?.playerTypes?.[playerIdx] === 'human';
}

function getNextPlayerInRotation(current) {
    const slots = getActivePlayerSlots();
    const activeAndNotFinished = slots.filter(i => !state.rankings || !state.rankings.includes(i));
    if (activeAndNotFinished.length === 0) return slots[0];
    
    let next = current;
    for (let k = 0; k < slots.length; k++) {
        const idx = slots.indexOf(next);
        const candidate = slots[(idx + 1) % slots.length];
        if (activeAndNotFinished.includes(candidate)) {
            return candidate;
        }
        next = candidate;
    }
    return slots[0];
}

function countHumansInLobby(config) {
    const cfg = config || (typeof state !== 'undefined' ? state.gameConfig : null) || (typeof lobbyConfig !== 'undefined' ? lobbyConfig : null) || getDefaultGameConfig();
    return getActivePlayerSlots(cfg).filter(i => cfg.playerTypes[i] === 'human').length;
}

function getHumanPlayerIndices(config) {
    const cfg = config || (typeof state !== 'undefined' ? state.gameConfig : null) || (typeof lobbyConfig !== 'undefined' ? lobbyConfig : null) || getDefaultGameConfig();
    return getActivePlayerSlots(cfg).filter(i => cfg.playerTypes?.[i] === 'human');
}

function createFreshGameState() {
    const sourceConfig = (typeof lobbyConfig !== 'undefined') ? lobbyConfig : (typeof state !== 'undefined' && state.gameConfig ? state.gameConfig : getDefaultGameConfig());
    const config = {
        mode: sourceConfig.mode || 'passAndPlay',
        playerCount: sourceConfig.playerCount,
        playerTypes: [...sourceConfig.playerTypes],
        botDifficulty: sourceConfig.botDifficulty,
        humanColorIndex: sourceConfig.humanColorIndex,
        ufoCount: 4,
        gameStarted: true
    };

    config.gameStarted = true;
    config.ufoCount = 4;
    
    if (config.playerCount === 1) {
        config.playerTypes = ['human', 'bot', 'bot', 'bot'];
    }

    const activeSlots = getActivePlayerSlots(config);
    const humanSlotsInActive = activeSlots.filter(idx => config.playerTypes[idx] === 'human');
    const botSlotsInActive = activeSlots.filter(idx => config.playerTypes[idx] === 'bot');

    let firstPlayer = activeSlots[0];
    if (humanSlotsInActive.length > 0 && botSlotsInActive.length > 0) {
        // Human vs Bots: The human gets first turn priority.
        firstPlayer = humanSlotsInActive[0];
    } else {
        // Human-Only or Bot-Only (normal turn order)
        firstPlayer = activeSlots[0];
    }

    const ufoCount = 4;

    return {
        gameConfig: config,
        activePlayer: firstPlayer,
        hasRolled: false,
        lastRoll: 0,
        pawnPositions: [
            Array(ufoCount).fill(-1),
            Array(ufoCount).fill(-1),
            Array(ufoCount).fill(-1),
            Array(ufoCount).fill(-1)
        ],
        warpUnlocked: [false, false, false, false],
        warpUsed: [false, false, false, false],
        aliensUsed: [
            [false, false],
            [false, false],
            [false, false],
            [false, false]
        ],
        canDeployAliens: [false, false, false, false],
        aliensOnBoard: [],
        isAnimating: false,
        activeWarpSelect: false,
        activeAlienSelect: -1,
        captures: [0, 0, 0, 0],
        timesCaptured: [0, 0, 0, 0],
        alienKills: [0, 0, 0, 0],
        playerPowerups: [[], [], [], []],
        consecutiveSixesCount: [0, 0, 0, 0],
        frozenTurns: [0, 0, 0, 0],
        shieldedPawns: [
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0)
        ],
        burningPawns: [
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0),
            Array(ufoCount).fill(0)
        ],
        rankings: [],
        temporarySafeZones: [],
        doubleMoveActive: false,
        activePowerUpTarget: null,
        diceHistory: [],
        roundsWithoutSix: [0, 0, 0, 0],
        autoMovePending: false
    };
}

function applyPlayerSlotVisibility() {
    for (let i = 0; i < 4; i++) {
        const zone = document.getElementById(`player-zone-${i}`);
        const inGame = isPlayerInGame(i);
        if (zone) {
            zone.style.display = inGame ? '' : 'none';
        }
        const panel = document.getElementById(`panel-${i}`);
        if (panel) {
            panel.classList.toggle('player-inactive', !inGame);
        }
    }

    document.querySelectorAll('.home-base').forEach(base => {
        if (typeof players !== 'undefined') {
            players.forEach(p => {
                if (base.classList.contains(`${p.color}-base`)) {
                    base.classList.toggle('home-base-inactive', !isPlayerInGame(p.id));
                }
            });
        }
    });
}

function resetMatchControls() {
    players.forEach(p => {
        const alienBtn = document.getElementById(`alien-${p.id}-combined`);
        if (alienBtn) {
            setButtonText(`alien-${p.id}-combined`, '👾 ALIEN DEPLOY', '👾');
            alienBtn.disabled = false;
            alienBtn.style.opacity = '1';
        }
        const w = document.getElementById(`warp-${p.id}`);
        if (w) {
            setButtonText(`warp-${p.id}`, '⚡ WARP', '⚡');
            w.disabled = true;
            w.classList.remove('unlocked', 'active-warp');
        }
    });
}

function updatePlayerTypeBadges() {
    for (let i = 0; i < 4; i++) {
        const nameEl = document.querySelector(`#panel-${i} .panel-name`);
        if (!nameEl || !isPlayerInGame(i)) continue;

        const baseName = players[i].name;
        if (isBot(i)) {
            nameEl.textContent = `${baseName} 🤖`;
        } else {
            nameEl.textContent = baseName;
        }
    }
}
