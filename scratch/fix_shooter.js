const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/scripts/shooter.js');
let code = fs.readFileSync(targetPath, 'utf8');

// Use window.innerWidth and innerHeight for canvas size
code = code.replace(/const w = container\.clientWidth;[\s\n]*const h = container\.clientHeight;/g, 
`const w = window.innerWidth;
        const h = window.innerHeight;`);

// Add pointermove event listener
code = code.replace(/canvas\.addEventListener\('mousemove', handleShooterInput\);/g, 
`canvas.addEventListener('mousemove', handleShooterInput);
        canvas.addEventListener('pointermove', handleShooterInput);`);

code = code.replace(/canvas\.removeEventListener\('mousemove', handleShooterInput\);/g, 
`canvas.removeEventListener('mousemove', handleShooterInput);
        canvas.removeEventListener('pointermove', handleShooterInput);`);

// Call resizeCanvas on window resize
if (!code.includes("window.addEventListener('resize', resizeCanvas)")) {
    code = code.replace(/function initShooterGame\(\) \{/, 
`window.addEventListener('resize', () => {
        if (gameActive) resizeCanvas();
    });

    function initShooterGame() {`);
}

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Fixed shooter.js');
