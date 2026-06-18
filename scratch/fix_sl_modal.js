const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/scripts/snakes_ladders.js');
let code = fs.readFileSync(targetPath, 'utf8');

const regex = /    diceValue: 1,\n    if \(typeof playSynthSound === 'function'\) playSynthSound\(400, 50, 0\.2, 'square'\);\n\};\n\nfunction updateSLSetupUI\(\) \{/;

const restoredSection = `    diceValue: 1,
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

function updateSLSetupUI() {`;

if (code.match(regex)) {
    code = code.replace(regex, restoredSection);
    fs.writeFileSync(targetPath, code, 'utf8');
    console.log("Restored snakes_ladders.js setup logic!");
} else {
    console.log("Regex did not match!");
}
