const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/scripts/dice.js');
let code = fs.readFileSync(targetPath, 'utf8');

// The corrupted block is:
/*
    } else {
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
    } else {
            roll = Math.floor(Math.random() * 5) + 1;
        }
    }
*/

// We need to replace it with the correct syntax:
const corruptedRegex = /    \} else \{\s*\/\/ Balanced odds[\s\S]*?if \(consecutive6 >= 2 && roll === 6\) \{\s*roll = Math\.floor\(Math\.random\(\) \* 5\) \+ 1;\s*\}\s*\} else \{\s*roll = Math\.floor\(Math\.random\(\) \* 5\) \+ 1;\s*\}\s*\}/;

const fixedBlock = `    } else {
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
    }`;

if (code.match(corruptedRegex)) {
    code = code.replace(corruptedRegex, fixedBlock);
    fs.writeFileSync(targetPath, code, 'utf8');
    console.log('Fixed syntax error in dice.js');
} else {
    console.log('Could not find the corrupted block in dice.js!');
}
