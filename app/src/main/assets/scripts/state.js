// Standard Game Constants & Common Track Definitions
const commonTrack = [
    [6,0],  [6,1],  [6,2],  [6,3],  [6,4],  [6,5],
    [5,6],  [4,6],  [3,6],  [2,6],  [1,6],  [0,6],
    [0,7],
    [0,8],  [1,8],  [2,8],  [3,8],  [4,8],  [5,8],
    [6,9],  [6,10], [6,11], [6,12], [6,13], [6,14],
    [7,14],
    [8,14], [8,13], [8,12], [8,11], [8,10], [8,9],
    [9,8],  [10,8], [11,8], [12,8], [13,8], [14,8],
    [14,7],
    [14,6], [13,6], [12,6], [11,6], [10,6], [9,6],
    [8,5],  [8,4],  [8,3],  [8,2],  [8,1],  [8,0],
    [7,0]
];

// Safe cell coordinates on the board (8 Star positions)
const safeCoordinates = [
    [6,1], [1,8], [8,13], [13,6], // 4 entry gate stars
    [2,6], [6,12], [12,8], [8,2]  // 4 bonus stars mid-path
];

// 11x11 Mini Ludo Track Definitions
const miniCommonTrack = [
    [4,0], [4,1], [4,2], [4,3],
    [3,4], [2,4], [1,4], [0,4],
    [0,5],
    [0,6], [1,6], [2,6], [3,6],
    [4,7], [4,8], [4,9], [4,10],
    [5,10],
    [6,10], [6,9], [6,8], [6,7],
    [7,6], [8,6], [9,6], [10,6],
    [10,5],
    [10,4], [9,4], [8,4], [7,4],
    [6,3], [6,2], [6,1], [6,0],
    [5,0]
];

const miniHomePaths = [
    [[5,1], [5,2], [5,3], [5,4]], // Green
    [[1,5], [2,5], [3,5], [4,5]], // Yellow
    [[9,5], [8,5], [7,5], [6,5]], // Red
    [[5,9], [5,8], [5,7], [5,6]]  // Blue
];

const miniSafeCoordinates = [
    [4,1], [1,6], [9,4], [6,9]
];

// Global dynamic helper functions
window.getFinishPos = function() {
    const isMini = (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') || (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.mode === 'miniLudo');
    return isMini ? 39 : 56;
};
window.getHomeStartPos = function() {
    const isMini = (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') || (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.mode === 'miniLudo');
    return isMini ? 35 : 51;
};
window.getCommonTrackLength = function() {
    const isMini = (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') || (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.mode === 'miniLudo');
    return isMini ? 36 : 52;
};

// Players metadata
const players = [
    { id: 0, color: 'green', name: 'PILOT GREEN', startIdx: 1, homeCells: [[7,1], [7,2], [7,3], [7,4], [7,5]], baseCoords: [[2,2], [2,3], [3,2], [3,3], [4,2]] },
    { id: 1, color: 'yellow', name: 'PILOT YELLOW', startIdx: 14, homeCells: [[1,7], [2,7], [3,7], [4,7], [5,7]], baseCoords: [[2,11], [2,12], [3,11], [3,12], [4,11]] },
    { id: 2, color: 'red', name: 'PILOT RED', startIdx: 40, homeCells: [[13,7], [12,7], [11,7], [10,7], [9,7]], baseCoords: [[11,2], [11,3], [12,2], [12,3], [13,2]] },
    { id: 3, color: 'blue', name: 'PILOT BLUE', startIdx: 27, homeCells: [[7,13], [7,12], [7,11], [7,10], [7,9]], baseCoords: [[11,11], [11,12], [12,11], [12,12], [13,11]] }
];

// Game State Variables
const _stateInstance = {
    STATE_VERSION: 1,
    gameConfig: getDefaultGameConfig(),
    activePlayer: 0,
    hasRolled: false,
    lastRoll: 0,
    pawnPositions: [
        [-1, -1, -1, -1], // P0 Green positions
        [-1, -1, -1, -1], // P1 Yellow positions
        [-1, -1, -1, -1], // P2 Red positions
        [-1, -1, -1, -1]  // P3 Blue positions
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
    aliensOnBoard: [], // Array of {playerIdx, alienIdx, cellIdx, killsLeft}
    isAnimating: false,
    activeWarpSelect: false,
    activeAlienSelect: -1, // alienIndex to deploy
    captures: [0, 0, 0, 0],
    timesCaptured: [0, 0, 0, 0],
    alienKills: [0, 0, 0, 0],
    rankings: [], // Game completion rankings list
    turnEpoch: 0
};

// Global timer registry to prevent background memory and CPU growth across reloads
const __originalSetTimeout = window.setTimeout;
const __originalSetInterval = window.setInterval;
const __originalClearTimeout = window.clearTimeout;
const __originalClearInterval = window.clearInterval;

const __registeredTimeouts = new Set();
const __registeredIntervals = new Set();

window.setTimeout = function(callback, delay, ...args) {
    const currentEpoch = (window.state && window.state.turnEpoch) ? window.state.turnEpoch : 0;
    const id = __originalSetTimeout(() => {
        __registeredTimeouts.delete(id);
        if (window.state && window.state.turnEpoch !== currentEpoch) {
            return; // turn epoch advanced, abort stale timer cleanly
        }
        callback(...args);
    }, delay);
    __registeredTimeouts.add(id);
    return id;
};

window.setInterval = function(callback, delay, ...args) {
    const currentEpoch = (window.state && window.state.turnEpoch) ? window.state.turnEpoch : 0;
    const id = __originalSetInterval(() => {
        if (window.state && window.state.turnEpoch !== currentEpoch) {
            __originalClearInterval(id);
            __registeredIntervals.delete(id);
            return; // turn epoch advanced, cancel stale interval
        }
        callback(...args);
    }, delay, ...args);
    __registeredIntervals.add(id);
    return id;
};

window.clearTimeout = function(id) {
    __registeredTimeouts.delete(id);
    __originalClearTimeout(id);
};

window.clearInterval = function(id) {
    __registeredIntervals.delete(id);
    __originalClearInterval(id);
};

window.resetGlobalGameTimersAndEpoch = function() {
    if (window.state) {
        window.state.turnEpoch = (window.state.turnEpoch || 0) + 1;
    }
    __registeredTimeouts.forEach(id => __originalClearTimeout(id));
    __registeredIntervals.forEach(id => __originalClearInterval(id));
    __registeredTimeouts.clear();
    __registeredIntervals.clear();
};

// Define getter/setter on window.state to automatically capture reassignments (e.g., state = createFreshGameState())
// while keeping the same reference under the hood.
Object.defineProperty(window, 'state', {
    get() {
        return _stateInstance;
    },
    set(newVal) {
        if (newVal && typeof newVal === 'object') {
            const nextEpoch = (_stateInstance.turnEpoch || 0) + 1;
            window.resetGlobalGameTimersAndEpoch();
            
            // Delete old keys (excluding STATE_VERSION and turnEpoch)
            for (let key in _stateInstance) {
                if (key !== 'STATE_VERSION' && key !== 'turnEpoch') {
                    delete _stateInstance[key];
                }
            }
            // Copy everything from the new state object into the original reference
            Object.assign(_stateInstance, newVal);
            _stateInstance.turnEpoch = nextEpoch;
            // Ensure STATE_VERSION is present
            _stateInstance.STATE_VERSION = 1;
        }
    },
    configurable: true,
    enumerable: true
});

// Provide accessor getter function
function getState() {
    return window.state;
}

// Path maps containing exact [r, c] arrays for each color (0 to 55)
window.pathMaps = {};
window.initPathMaps = function() {
    window.pathMaps = {};
    const isMini = (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') || (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.mode === 'miniLudo');
    const track = isMini ? miniCommonTrack : commonTrack;
    const trackLen = isMini ? 36 : 52;
    const commonPathLen = isMini ? 35 : 51;
    const startIdxs = isMini ? [1, 10, 28, 19] : [1, 14, 40, 27];
    const homeCellsList = isMini ? miniHomePaths : players.map(p => p.homeCells);

    players.forEach(p => {
        const path = [];
        const startIdx = startIdxs[p.id];
        const homeCells = homeCellsList[p.id];
        
        for (let i = 0; i < commonPathLen; i++) {
            const idx = (startIdx + i) % trackLen;
            path.push(track[idx]);
        }
        window.pathMaps[p.id] = [...path, ...homeCells];
    });
};
window.initPathMaps();

// Robust active game state persistence across process lifecycles and backgrounding
window.saveGameStateToLocalStorage = function() {
    if (typeof localStorage !== 'undefined' && window.state && window.state.gameConfig && window.state.gameConfig.gameStarted) {
        localStorage.setItem('space_ludo_saved_flight_state', JSON.stringify(window.state));
    }
};

window.loadGameStateFromLocalStorage = function() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('space_ludo_saved_flight_state');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object' && parsed.gameConfig && parsed.gameConfig.gameStarted) {
                    return parsed;
                }
            } catch (e) {
                console.error("Failed loading saved match", e);
            }
        }
    }
    return null;
};

window.clearSavedGameState = function() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('space_ludo_saved_flight_state');
    }
};
