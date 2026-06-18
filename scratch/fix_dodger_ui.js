const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/src/main/assets/space_ludo.html');
let code = fs.readFileSync(targetPath, 'utf8');

// Fix mojibake
code = code.replace(/<div id="dodger-overlay-icon"([^>]*)>\?\?<\/div>/g, '<div id="dodger-overlay-icon"$1>🛸</div>');
code = code.replace(/<div class="dodger-hud-title">\?\? NEBULA FLIGHT RUN<\/div>/g, '<div class="dodger-hud-title">🚀 NEBULA FLIGHT RUN</div>');
code = code.replace(/<div style="font-size:3\.5rem;animation:floatingUfo 3s ease-in-out infinite;">\?\?<\/div>/g, '<div style="font-size:3.5rem;animation:floatingUfo 3s ease-in-out infinite;">🛸</div>');

// Fix HUD overlap by ensuring it can scale down or wrap
// We can use flex-wrap or just make the center title smaller and truncate it.
code = code.replace(/#cosmic-dodger-view \.dodger-hud \{([\s\S]*?)\}/, (match, p1) => {
    if (!p1.includes('flex-wrap: wrap;')) {
        return `#cosmic-dodger-view .dodger-hud {${p1}\n                flex-wrap: wrap;\n            }`;
    }
    return match;
});

// Also make dodger-hud-title flex basis 100% on small screens or just give it a minimum width
code = code.replace(/#cosmic-dodger-view \.dodger-hud-title \{([\s\S]*?)\}/, (match, p1) => {
    if (!p1.includes('white-space: nowrap;')) {
        return `#cosmic-dodger-view .dodger-hud-title {${p1}\n                white-space: nowrap;\n                overflow: hidden;\n                text-overflow: ellipsis;\n                max-width: 40%;\n            }`;
    }
    return match;
});

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Fixed dodger UI');
