const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/scripts/snakes_ladders.js');
let lines = fs.readFileSync(targetPath, 'utf8').split('\n');

// Find where updateSLSetupUI actually is now.
let updateIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("if (btn) btn.classList.toggle('selected', slState.boardDifficulty === diff);")) {
        updateIndex = i - 2; // -2 to reconstruct `function updateSLSetupUI() {` and `forEach`
        break;
    }
}

const header = `// Snakes and Ladders (Starways & Wormholes) Game Module
// Fully integrated with space themes, sounds, active bot turns, multiplayer, and difficulty levels

const SL_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']; // Blue, Red, Green, Yellow
const SL_ICONS = ['🚀', '🛸', '🛰️', '☄️'];

const SL_BOARDS = {
    beginner: {
        STARWAYS: { 4: 24, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91, 75: 96 },
        WORMHOLES: { 17: 7, 54: 34, 62: 18, 64: 60, 93: 73 }
    },
    standard: {
        STARWAYS: { 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91 },
        WORMHOLES: { 17: 7, 54: 34, 62: 18, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78 }
    },
    extreme: {
        STARWAYS: { 9: 31, 20: 38, 40: 59, 63: 81 },
        WORMHOLES: { 17: 7, 33: 6, 54: 34, 62: 18, 64: 60, 87: 24, 93: 73, 95: 75, 97: 42, 99: 78 }
    }
};

let slState = {
    players: [], // { id: number, type: 'human' | 'bot' | 'network', pos: number, name: string, color: string, icon: string }
    activePlayerIndex: 0,
    isRolling: false,
    isMoving: false,
    diceValue: 1,
    gameActive: false,
    boardDifficulty: 'standard',
    isMultiplayer: false,
    gameConfig: {}
};

// Setup Modal Logic
window.openSLSetupModal = function() {
    slState.gameConfig.crewSize = slState.gameConfig.crewSize || 4;
    slState.boardDifficulty = slState.boardDifficulty || 'standard';
    
    // Default config if not set
    if (!slState.gameConfig.players) {
        slState.gameConfig.players = [];
        for (let i = 0; i < 4; i++) {
            slState.gameConfig.players.push(i === 0 ? 'human' : 'bot');
        }
    }
    
    updateSLSetupUI();
    const modal = document.getElementById('sl-setup-modal');
    if (modal) modal.classList.add('active');
};

window.setSLBoardDifficulty = function(diff) {
    slState.boardDifficulty = diff;
    updateSLSetupUI();
    if (typeof playSynthSound === 'function') playSynthSound(300, 50, 0.2, 'square');
};

window.setSLCrewSize = function(size) {
    slState.gameConfig.crewSize = size;
    updateSLSetupUI();
    if (typeof playSynthSound === 'function') playSynthSound(400, 50, 0.2, 'square');
};

function updateSLSetupUI() {
    ['beginner', 'standard', 'extreme'].forEach(diff => {`;

const fixedCode = header + '\n' + lines.slice(updateIndex + 2).join('\n');
fs.writeFileSync(targetPath, fixedCode, 'utf8');
console.log("Completely restored top of snakes_ladders.js!");
