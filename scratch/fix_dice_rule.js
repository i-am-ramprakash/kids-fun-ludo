const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/scripts/dice.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Replace the dice rolling logic inside rollPlayerDice
// Original logic has "} else if (consecutive6 >= 2) {" block and "Network bust handler" block
// We need to carefully replace the block.
code = code.replace(
    /    \} else if \(consecutive6 >= 2\) \{[\s\S]*?\} else \{[\s\S]*?        \}/,
    `    } else {
        // Balanced odds defined by constant standard Ludo roll chance
        if (Math.random() < DICE_SIX_PROBABILITY) {
            roll = 6;
        } else {
            roll = Math.floor(Math.random() * 5) + 1;
        }
        
        // Remove 3-sixes rule: Cap the third roll to 5 if player has rolled two 6s
        if (consecutive6 >= 2 && roll === 6) {
            roll = Math.floor(Math.random() * 5) + 1;
        }
    }`
);

// Remove the network bust handler
code = code.replace(
    /    \/\/ Network bust handler[\s\S]*?        return;\n    \}/,
    ``
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Fixed dice rule in dice.js');
