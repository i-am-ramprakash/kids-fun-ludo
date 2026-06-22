// Kid-friendly board definitions
const KID_BOARDS = {
classic: {
        name: 'Classic',
        emoji: '🎮',
        colors: {
             bg: '#0d0630', cellBg: '#1a0a4d', cellBorder: '#FF6B9D',
             green: '#2ED573', yellow: '#FFC312', red: '#FF4757', blue: '#1E90FF',
             purple: '#FF6B9D', gold: '#FFD600', cyan: '#00E5FF'
         },
         pawnEmojis: ['🟢🛸', '🟡🛸', '🔴🛸', '🔵🛸'],
        modeNames: {
            passAndPlay: 'Classic Mode', quick: 'Solo Adventure', clash: 'Powerup Battle', sl: 'Rocket Race'
        },
        cost: 0,
        locked: false
    },
    candyLand: {
        name: 'Candy Land',
        emoji: '🍭',
        colors: {
            bg: '#FFF9E6', cellBg: '#E8F8F5', cellBorder: '#FFB8D0',
            green: '#2ED573', yellow: '#FFC312', red: '#FF4757', blue: '#1E90FF',
            purple: '#FF6B9D', gold: '#FFA502', cyan: '#00D2D3'
        },
        pawnEmojis: ['🟢🛸', '🟡🛸', '🔴🛸', '🔵🛸'],
        modeNames: {
            passAndPlay: 'Classic Mode', quick: 'Solo Adventure', clash: 'Powerup Battle', sl: 'Rocket Race'
        },
        cost: 10000,
        locked: true
    },
    jungle: {
        name: 'Jungle Adventure',
        emoji: '🌴',
        colors: {
            bg: '#F1F8E9', cellBg: '#E8F5E9', cellBorder: '#A5D6A7',
            green: '#00C853', yellow: '#FFD600', red: '#FF5252', blue: '#448AFF',
            purple: '#69F0AE', gold: '#FFAB00', cyan: '#64FFDA'
        },
        pawnEmojis: ['🦁', '🐯', '🐻', '🐵'],
        modeNames: {
            passAndPlay: 'Safari Party', quick: 'Jungle Solo', clash: 'Wild Battle', sl: 'Banana Race'
        },
        cost: 10000,
        locked: true
    },
    ocean: {
        name: 'Ocean World',
        emoji: '🌊',
        colors: {
            bg: '#E0F7FA', cellBg: '#E1F5FE', cellBorder: '#80DEEA',
            green: '#00E676', yellow: '#FFEA00', red: '#FF4081', blue: '#2979FF',
            purple: '#40C4FF', gold: '#FF9100', cyan: '#18FFFF'
        },
        pawnEmojis: ['🐬', '🐙', '🐠', '🐡'],
        modeNames: {
            passAndPlay: 'Beach Party', quick: 'Ocean Solo', clash: 'Wave Battle', sl: 'Coral Race'
        },
        cost: 10000,
        locked: true
    },
    heroes: {
        name: 'Super Heroes',
        emoji: '🦸',
        colors: {
            bg: '#FFFFFF', cellBg: '#F5F5F5', cellBorder: '#BDBDBD',
            green: '#00E676', yellow: '#FFD600', red: '#FF1744', blue: '#2979FF',
            purple: '#D500F9', gold: '#FFC400', cyan: '#00E5FF'
        },
        pawnEmojis: ['🦸', '🦹', '🦺', '🦸\u200d♀️'],
        modeNames: {
            passAndPlay: 'Hero Party', quick: 'Hero Solo', clash: 'Epic Battle', sl: 'Hero Race'
        },
        cost: 10000,
        locked: true
    }
};

// Keep theme system compatibility
const KID_THEMES = KID_BOARDS;

function getThemeCSSVars(themeKey) {
    const t = KID_BOARDS[themeKey] || KID_BOARDS.classic;
    return `--bg-color:${t.colors.bg}; --cell-bg:${t.colors.cellBg}; --cell-border:${t.colors.cellBorder}; --green:${t.colors.green}; --yellow:${t.colors.yellow}; --red:${t.colors.red}; --blue:${t.colors.blue}; --purple:${t.colors.purple}; --gold:${t.colors.gold}; --cyan:${t.colors.cyan};`;
}

function getCurrentBoardKey() {
    return localStorage.getItem('kids_ludo_board') || 'classic';
}

function getCurrentThemeKey() {
    return getCurrentBoardKey();
}

function isBoardUnlocked(boardKey) {
    const board = KID_BOARDS[boardKey];
    if (!board) return false;
    if (!board.locked) return true;
    return localStorage.getItem(`kids_ludo_board_${boardKey}_unlocked`) === 'true';
}

function applyThemeToRoot(themeKey) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const vars = getThemeCSSVars(themeKey);
    vars.split(';').filter(Boolean).forEach(v => {
        const [k, val] = v.split(':');
        if (k && val) root.style.setProperty(k.trim(), val.trim());
    });
    localStorage.setItem('kids_ludo_board', themeKey);
}

function getCurrentThemeModeNames() {
    const key = getCurrentThemeKey();
    return KID_THEMES[key] ? KID_THEMES[key].modeNames : {};
}

function getCurrentThemePawnEmojis() {
    const key = getCurrentThemeKey();
    return KID_THEMES[key] ? KID_THEMES[key].pawnEmojis : ['🟢🛸', '🟡🛸', '🔴🛸', '🔵🛸'];
}
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
        theme: getCurrentBoardKey(),
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
    const isMultiplayer = (window.Multiplayer && window.Multiplayer.isOnline) || (typeof state !== 'undefined' && state && state.isMultiplayer);
    const sourceConfig = (isMultiplayer && typeof state !== 'undefined' && state && state.gameConfig)
        ? state.gameConfig
        : ((typeof lobbyConfig !== 'undefined') ? lobbyConfig : getDefaultGameConfig());

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
        isMultiplayer: isMultiplayer,
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
            setButtonText(`alien-${p.id}-combined`, '👾 SEND MONSTER', '👾');
            alienBtn.disabled = false;
            alienBtn.style.opacity = '1';
        }
        const w = document.getElementById(`warp-${p.id}`);
        if (w) {
            setButtonText(`warp-${p.id}`, 'ZOOM!', '⚡');
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

