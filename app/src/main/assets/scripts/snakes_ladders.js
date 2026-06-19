// snakes_ladders.js
// Rockets & Wormholes Engine (10x10 Zigzag Grid)
// Complete redesign: proper 6-to-enter, sidebar crew panel, dice UI, path arrows

// ─── Constants ───────────────────────────────────────────────────────────────
const SL_BOARD_SIZE = 100;
const SL_GRID_COLS  = 10;
const SL_GRID_ROWS  = 10;

// ─── Boards Configurations ───────────────────────────────────────────────────────
const SL_BOARDS = [
    {
        name: "Level 1: Novice Orbit",
        difficulty: "EASY",
        diffColor: "#4ade80",
        rockets: { 4: 22, 9: 31, 20: 41, 28: 52, 40: 63, 51: 72, 63: 81, 71: 91 },
        wormholes: { 17: 7, 29: 12, 46: 26, 60: 39, 68: 49, 77: 58, 89: 66, 97: 78 }
    },
    {
        name: "Level 2: Asteroid Belt",
        difficulty: "MEDIUM",
        diffColor: "#facc15",
        rockets: { 10: 25, 21: 42, 33: 52, 45: 64, 55: 75, 70: 89 },
        wormholes: { 18: 6, 31: 14, 49: 30, 61: 43, 76: 54, 88: 68, 95: 77, 98: 80 }
    },
    {
        name: "Level 3: Nebula Storm",
        difficulty: "HARD",
        diffColor: "#f87171",
        rockets: { 8: 30, 25: 45, 50: 68, 65: 85 },
        wormholes: { 20: 2, 35: 15, 55: 35, 75: 51, 85: 66, 92: 70, 96: 60, 99: 20 }
    },
    {
        name: "Level 4: Black Hole",
        difficulty: "EXTREME",
        diffColor: "#c084fc",
        rockets: { 5: 15, 30: 50, 60: 80 },
        wormholes: { 19: 5, 36: 12, 48: 24, 62: 38, 72: 44, 82: 58, 93: 65, 96: 40, 98: 10 }
    },
    {
        name: "Level 5: Rocket Paradise",
        difficulty: "TURBO",
        diffColor: "#38bdf8",
        rockets: { 3: 24, 12: 32, 18: 39, 25: 45, 33: 54, 42: 63, 50: 71, 58: 77, 65: 86, 75: 94, 82: 96 },
        wormholes: { 20: 19, 88: 85 } // Very minor setbacks
    }
];

const SL_COLORS = [
    { name: "GREEN",  color: "#4ade80", glowColor: "rgba(74,222,128,0.6)",  cssClass: "green",  icon: "🟢" },
    { name: "YELLOW", color: "#facc15", glowColor: "rgba(250,204,21,0.6)",  cssClass: "yellow", icon: "🟡" },
    { name: "RED",    color: "#f87171", glowColor: "rgba(248,113,113,0.6)", cssClass: "red",    icon: "🔴" },
    { name: "BLUE",   color: "#60a5fa", glowColor: "rgba(96,165,250,0.6)",  cssClass: "blue",   icon: "🔵" }
];

// ─── State ────────────────────────────────────────────────────────────────────
let slState = {
    players: [],
    currentPlayerIndex: 0,
    selectedBoardIndex: 0,
    isPlaying: false,
    playerCount: 4,
    playerTypes: ['human', 'bot', 'bot', 'bot'],
    finishedPlayers: [],
    isRolling: false
};

// ─── Setup / Navigation ───────────────────────────────────────────────────────
window.selectSLGame = function() {
    const modal = document.getElementById('sl-setup-modal');
    if (modal) {
        modal.classList.add('active');
        updateSLBoardPreview();
    }
};

window.setSLLobbyPlayerCount = function(count, event) {
    slState.playerCount = count;
    document.querySelectorAll('#sl-player-count-options .setup-chip').forEach(c => c.classList.remove('selected'));
    if (event) event.currentTarget.classList.add('selected');
    else {
        const chip = document.querySelector(`#sl-player-count-options [data-count="${count}"]`);
        if (chip) chip.classList.add('selected');
    }
    renderSLPlayerSlots();
};

window.cycleSLCrewSize = function(event) {
    if (event && (event.target.tagName === 'BUTTON' || event.target.closest('button'))) return;
    const current = slState.playerCount || 4;
    const next = current === 2 ? 3 : (current === 3 ? 4 : 2);
    window.setSLLobbyPlayerCount(next);
};

window.setSLLobbyPlayerType = function(playerIdx, type, event) {
    if (event) event.stopPropagation();
    if (type === 'human') {
        slState.playerTypes[playerIdx] = 'human';
    } else {
        // Ensure at least one human is left among active players
        let humanCount = 0;
        for (let i = 0; i < slState.playerCount; i++) {
            if (i !== playerIdx && slState.playerTypes[i] === 'human') humanCount++;
        }
        if (humanCount === 0) {
            showSLToast('At least one pilot must be a human operator.', '#facc15');
            return;
        }
        slState.playerTypes[playerIdx] = 'bot';
    }
    renderSLPlayerSlots();
};

function renderSLPlayerSlots() {
    const container = document.getElementById('sl-player-slot-config');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < slState.playerCount; i++) {
        const slot = document.createElement('div');
        const isHuman = slState.playerTypes[i] === 'human';
        slot.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;width:100%;';
        slot.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <div class="pawn ${SL_COLORS[i].cssClass}-p" style="width:28px;height:28px;font-size:15px;margin:0;position:relative;flex-shrink:0;">
                    🛸<div class="engine-flame"></div>
                </div>
                <span style="color:#fff;font-weight:900;font-family:'Nunito',sans-serif;font-size:0.85rem;">Pilot ${SL_COLORS[i].name}</span>
            </div>
            <div class="setup-type-toggle">
                <button type="button" class="setup-chip ${isHuman ? 'selected' : ''}"
                    onclick="setSLLobbyPlayerType(${i}, 'human', event)" style="padding:4px 8px;">👤</button>
                <button type="button" class="setup-chip ${!isHuman ? 'selected' : ''}"
                    onclick="setSLLobbyPlayerType(${i}, 'bot', event)" style="padding:4px 8px;">🤖</button>
            </div>
        `;
        container.appendChild(slot);
    }
}

window.startSLGameFromSetup = function() {
    document.getElementById('sl-setup-modal').classList.remove('active');
    openSnakesAndLadders();
};

window.openSnakesAndLadders = function() {
    if (typeof navigateTo === 'function') navigateTo('snakes-ladders-view');
    initSLGame();
};

// ─── Grid Math ────────────────────────────────────────────────────────────────
function getSLCellPercent(cellNum) {
    if (cellNum < 1)   cellNum = 1;
    if (cellNum > 100) cellNum = 100;

    const zi  = cellNum - 1;
    const row = Math.floor(zi / SL_GRID_COLS);
    let   col = zi % SL_GRID_COLS;
    if (row % 2 !== 0) col = (SL_GRID_COLS - 1) - col;

    const cw = 100 / SL_GRID_COLS;
    const ch = 100 / SL_GRID_ROWS;
    const x  = col * cw + cw / 2;
    const y  = 100 - (row * ch + ch / 2);
    return { x, y };
}

// ─── UI Logic for Board Selection ──────────────────────────────────────────────
window.cycleSLBoard = function(dir) {
    let nextIdx = slState.selectedBoardIndex + dir;
    if (nextIdx < 0) nextIdx = SL_BOARDS.length - 1;
    if (nextIdx >= SL_BOARDS.length) nextIdx = 0;
    slState.selectedBoardIndex = nextIdx;
    updateSLBoardPreview();
};

window.updateSLBoardPreview = function() {
    const config = SL_BOARDS[slState.selectedBoardIndex];
    const nameEl = document.getElementById('sl-board-name');
    const diffEl = document.getElementById('sl-board-difficulty');
    if (nameEl) nameEl.textContent = config.name;
    if (diffEl) {
        diffEl.textContent = config.difficulty;
        diffEl.style.color = config.diffColor;
    }

    const previewContainer = document.getElementById('sl-board-preview-container');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    previewContainer.appendChild(canvas);

    const W = previewContainer.offsetWidth || 100;
    const H = previewContainer.offsetHeight || 100;
    
    // Quick timeout to let DOM render and compute offsetWidth if it's 0
    if (W === 0) {
        setTimeout(() => drawSLGridOnCanvas(canvas, previewContainer.offsetWidth || 100, previewContainer.offsetHeight || 100, config), 50);
    } else {
        drawSLGridOnCanvas(canvas, W, H, config);
    }
};

window.drawSLGridOnCanvas = function(canvas, viewW, viewH, boardConfig) {
    // Draw at a fixed high resolution so small fonts don't hit browser minimums,
    // then scale down via CSS to the requested view size.
    const W = 1000;
    const H = 1000;

    canvas.width  = W;
    canvas.height = H;
    canvas.style.width  = viewW + 'px';
    canvas.style.height = viewH + 'px';
    const ctx = canvas.getContext('2d');
    
    const cw = W / SL_GRID_COLS;
    const ch = H / SL_GRID_ROWS;

    // Background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d0828');
    bg.addColorStop(1, '#020409');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 60; i++) {
        const a = Math.random() * 0.4 + 0.05;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 3 + 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // Helper: board pixel center for cell number
    function cellCenter(num) {
        const { x, y } = getSLCellPercent(num);
        return { px: x / 100 * W, py: y / 100 * H };
    }

    // Draw cells
    for (let n = 1; n <= 100; n++) {
        const { px, py } = cellCenter(n);
        const x = px - cw / 2;
        const y = py - ch / 2;

        const hasRocket   = !!boardConfig.rockets[n];
        const hasWormhole = !!boardConfig.wormholes[n];
        const isStart  = n === 1;
        const isFinish = n === 100;

        // Cell BG
        let fillColor = n % 2 === 0 ? 'rgba(22,12,55,0.85)' : 'rgba(12,6,32,0.75)';
        if (isStart)      fillColor = 'rgba(30,80,40,0.7)';
        if (isFinish)     fillColor = 'rgba(100,80,10,0.7)';
        if (hasRocket)    fillColor = 'rgba(20,60,30,0.75)';
        if (hasWormhole)  fillColor = 'rgba(60,20,80,0.75)';

        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cw - 2, ch - 2, 4);
        ctx.fill();

        // Cell border
        ctx.strokeStyle = hasRocket   ? 'rgba(74,222,128,0.45)' :
                          hasWormhole ? 'rgba(168,85,247,0.45)' :
                                       'rgba(100,60,200,0.25)';
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Cell number
        const fontSize = Math.max(7, Math.round(cw * 0.18));
        ctx.fillStyle = hasRocket   ? 'rgba(100,255,140,0.75)' :
                        hasWormhole ? 'rgba(200,130,255,0.75)' :
                                     'rgba(160,150,200,0.55)';
        ctx.font = `700 ${fontSize}px Nunito,sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(n.toString(), x + 3, y + 2);

        // Emoji icons
        if (isStart) {
            ctx.font = `${Math.round(cw * 0.42)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🚀', px, py + 2);
        }
        if (isFinish) {
            ctx.font = `${Math.round(cw * 0.42)}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🏆', px, py + 2);
        }
    }

    // Helper: compute a quadratic Bezier control point that bows the curve
    // to one side so rocket lines and wormhole lines don't overlap each other.
    function bezierCP(fx, fy, tx, ty, bowSide) {
        // Mid-point of the segment
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        // Perpendicular direction
        const dx = tx - fx;
        const dy = ty - fy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / len;
        const perpY =  dx / len;
        // Bow amount: ~25% of segment length, capped so it doesn't go off-canvas
        const bow = Math.min(len * 0.28, cw * 2.5) * bowSide;
        return { cpx: mx + perpX * bow, cpy: my + perpY * bow };
    }

    // Helper: point on a quadratic Bezier at t
    function bezierPoint(fx, fy, cpx, cpy, tx, ty, t) {
        const u = 1 - t;
        return {
            x: u * u * fx + 2 * u * t * cpx + t * t * tx,
            y: u * u * fy + 2 * u * t * cpy + t * t * ty
        };
    }

    // Draw Rocket paths — curves bow to the LEFT of travel direction
    ctx.setLineDash([]);
    Object.entries(boardConfig.rockets).forEach(([from, to]) => {
        const f = cellCenter(parseInt(from));
        const t = cellCenter(parseInt(to));
        const { cpx, cpy } = bezierCP(f.px, f.py, t.px, t.py, +1);

        ctx.strokeStyle = 'rgba(74,222,128,0.75)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(f.px, f.py);
        ctx.quadraticCurveTo(cpx, cpy, t.px, t.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead — tangent at end of bezier (t=0.95)
        const near = bezierPoint(f.px, f.py, cpx, cpy, t.px, t.py, 0.95);
        const angle = Math.atan2(t.py - near.y, t.px - near.x);
        const alen = 10;
        ctx.fillStyle = 'rgba(74,222,128,0.95)';
        ctx.beginPath();
        ctx.moveTo(t.px, t.py);
        ctx.lineTo(t.px - alen * Math.cos(angle - 0.4), t.py - alen * Math.sin(angle - 0.4));
        ctx.lineTo(t.px - alen * Math.cos(angle + 0.4), t.py - alen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.font = `${Math.round(cw * 0.38)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🚀', f.px, f.py + 2);

        // Destination glow
        const grad = ctx.createRadialGradient(t.px, t.py, 0, t.px, t.py, cw * 0.38);
        grad.addColorStop(0, 'rgba(74,222,128,0.25)');
        grad.addColorStop(1, 'rgba(74,222,128,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.px, t.py, cw * 0.38, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Wormhole paths — curves bow to the RIGHT of travel direction (opposite side)
    Object.entries(boardConfig.wormholes).forEach(([from, to]) => {
        const f = cellCenter(parseInt(from));
        const t = cellCenter(parseInt(to));
        const { cpx, cpy } = bezierCP(f.px, f.py, t.px, t.py, -1);

        ctx.strokeStyle = 'rgba(192,100,255,0.75)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(f.px, f.py);
        ctx.quadraticCurveTo(cpx, cpy, t.px, t.py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead — tangent at end of bezier (t=0.95)
        const near = bezierPoint(f.px, f.py, cpx, cpy, t.px, t.py, 0.95);
        const angle = Math.atan2(t.py - near.y, t.px - near.x);
        const alen = 10;
        ctx.fillStyle = 'rgba(192,100,255,0.95)';
        ctx.beginPath();
        ctx.moveTo(t.px, t.py);
        ctx.lineTo(t.px - alen * Math.cos(angle - 0.4), t.py - alen * Math.sin(angle - 0.4));
        ctx.lineTo(t.px - alen * Math.cos(angle + 0.4), t.py - alen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.font = `${Math.round(cw * 0.38)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🌀', f.px, f.py + 2);

        // Destination glow
        const grad = ctx.createRadialGradient(t.px, t.py, 0, t.px, t.py, cw * 0.38);
        grad.addColorStop(0, 'rgba(168,85,247,0.25)');
        grad.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(t.px, t.py, cw * 0.38, 0, Math.PI * 2);
        ctx.fill();
    });

    // Border glow
    ctx.strokeStyle = 'rgba(124,58,237,0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(1, 1, W - 2, H - 2);
};

// ─── Board Generation ─────────────────────────────────────────────────────────
function generateSLBoard(container) {
    const existing = container.querySelectorAll('.sl-board-canvas');
    existing.forEach(e => e.remove());

    const canvas = document.createElement('canvas');
    canvas.className = 'sl-board-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border-radius:10px;';
    container.insertBefore(canvas, container.firstChild);

    function doDraw() {
        const W = container.offsetWidth || 400;
        const H = container.offsetHeight || 400;
        if (W > 0) {
            drawSLGridOnCanvas(canvas, W, H, SL_BOARDS[slState.selectedBoardIndex]);
        }
    }

    doDraw();
    window.addEventListener('resize', doDraw, { once: true });
}

// ─── Game Init ────────────────────────────────────────────────────────────────
function initSLGame() {
    slState.players = [];
    for (let i = 0; i < slState.playerCount; i++) {
        let name = SL_COLORS[i].name;
        if (slState.playerTypes[i] === 'human') {
            if (typeof commanderProfile !== 'undefined' && commanderProfile.commanderName) {
                name = commanderProfile.commanderName.trim().toUpperCase() || name;
            }
        }
        slState.players.push({
            id: i,
            name: name,
            color: SL_COLORS[i].color,
            glowColor: SL_COLORS[i].glowColor,
            cssClass: SL_COLORS[i].cssClass,
            pos: 0,        // 0 = waiting in base; 1–100 = on board
            onBoard: false,// needs 6 to enter
            totalTurns: 0,
            rocketsCaught: 0,
            wormholesHit: 0,
            finished: false,
            rank: 0,
            el: null
        });
    }
    slState.currentPlayerIndex = 0;
    slState.finishedPlayers = [];
    slState.isPlaying = true;
    slState.isRolling = false;

    buildSLGameLayout();
    
    // Auto-roll for bot if the first player is a bot
    const p = slState.players[0];
    if (slState.playerTypes[p.id] === 'bot') {
        setTimeout(() => {
            if (slState.isPlaying && !slState.isRolling) {
                rollSLDice();
            }
        }, 1200);
    }
}

// ─── Layout Builder ───────────────────────────────────────────────────────────
function buildSLGameLayout() {
    const view = document.getElementById('snakes-ladders-view');
    if (!view) return;

    // Wipe and rebuild
    view.innerHTML = '';
    view.style.cssText = `
        display:flex; flex-direction:column; align-items:stretch;
        position:fixed; inset:0; width:100vw; height:100vh;
        background:radial-gradient(circle at 30% 20%, #12063a 0%, #030409 80%);
        overflow:hidden; z-index:50; box-sizing:border-box; font-family:'Nunito',sans-serif;
    `;

    // ── Top bar ──────────────────────────────────────────────────────────────
    const topBar = document.createElement('div');
    topBar.style.cssText = `
        display:flex; align-items:center; justify-content:space-between;
        padding:8px 12px; background:rgba(0,0,0,0.45);
        border-bottom:1px solid rgba(124,58,237,0.3); flex-shrink:0;
    `;
    topBar.innerHTML = `
        <button onclick="navigateTo('home-screen')" style="
            background:rgba(11,14,27,0.8); border:1px solid #4c1d95; color:#c084fc;
            padding:6px 10px; border-radius:8px; font-family:'Nunito',sans-serif;
            font-weight:700; font-size:0.65rem; cursor:pointer; letter-spacing:0.5px;">
            ◀ HUB
        </button>
        <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:1rem;">🚀</span>
            <span style="color:#c084fc;font-weight:900;font-size:0.85rem;letter-spacing:1px;">ROCKETS &amp; WORMHOLES</span>
            <span style="font-size:1rem;">🌀</span>
        </div>
        <div id="sl-turn-indicator" style="
            color:#fff;font-weight:900;font-size:0.7rem;padding:4px 8px;
            border-radius:8px;background:rgba(0,0,0,0.5);
            border:1px solid rgba(124,58,237,0.4);min-width:80px;text-align:center;">
        </div>
    `;
    view.appendChild(topBar);

    // ── Main game area ────────────────────────────────────────────────────────
    const main = document.createElement('div');
    main.style.cssText = `
        display:flex; flex-direction:column; flex:1; overflow:hidden; gap:0; min-height:0; position:relative;
    `;
    view.appendChild(main);

    // ── Global Messages ───────────────────────────────────────────────────────
    const permanentMsg = document.createElement('div');
    permanentMsg.style.cssText = `
        position:absolute; top:10px; left:50%; transform:translateX(-50%);
        background:rgba(124,58,237,0.8); color:#fff; font-weight:700;
        padding:4px 12px; border-radius:12px; z-index:90; font-size:0.65rem;
        box-shadow:0 0 10px rgba(124,58,237,0.4); text-align:center;
        pointer-events:none; font-family:'Nunito',sans-serif; letter-spacing:0.5px;
    `;
    permanentMsg.innerHTML = 'Overshoot 100? You will bounce back!';
    main.appendChild(permanentMsg);

    const defaultMsg = document.createElement('div');
    defaultMsg.style.cssText = `
        position:absolute; top:35px; left:50%; transform:translateX(-50%);
        background:rgba(250,204,21,0.9); color:#000; font-weight:900;
        padding:8px 20px; border-radius:20px; z-index:100; font-size:0.85rem;
        box-shadow:0 0 15px rgba(250,204,21,0.5); text-align:center;
        transition:opacity 0.5s ease; pointer-events:none; font-family:'Nunito',sans-serif;
    `;
    defaultMsg.innerHTML = 'Need a 🎲6 to launch!';
    main.appendChild(defaultMsg);

    setTimeout(() => {
        if (defaultMsg) {
            defaultMsg.style.opacity = '0';
            setTimeout(() => defaultMsg.remove(), 500);
        }
    }, 60000); // 1 minute

    // ── Board & Corners Wrapper ───────────────────────────────────────────────
    const boardWrap = document.createElement('div');
    boardWrap.style.cssText = `
        flex:1; position:relative; min-width:0; min-height:0;
        display:flex; align-items:center; justify-content:center;
        padding:10px;
    `;

    const layoutWrapper = document.createElement('div');
    layoutWrapper.style.cssText = `
        position:relative;
        width:min(100vw - 20px, calc(100vh - 240px));
        max-width:500px;
        aspect-ratio:1;
        flex-shrink:0;
    `;

    const boardContainer = document.createElement('div');
    boardContainer.id = 'sl-board-container';
    boardContainer.style.cssText = `
        position:absolute; inset:0;
        border:2px solid rgba(124,58,237,0.5);
        border-radius:12px;
        box-shadow:0 0 30px rgba(124,58,237,0.3);
        overflow:hidden;
    `;
    layoutWrapper.appendChild(boardContainer);
    boardWrap.appendChild(layoutWrapper);
    main.appendChild(boardWrap);

    // ── 4 Corners ─────────────────────────────────────────────────────────────
    const cornerPositions = [
        { top: '100%', left: '0', margin: '12px 0 0 0', flexDirection: 'row' },
        { bottom: '100%', left: '0', margin: '0 0 12px 0', flexDirection: 'row' },
        { top: '100%', right: '0', margin: '12px 0 0 0', flexDirection: 'row-reverse' },
        { bottom: '100%', right: '0', margin: '0 0 12px 0', flexDirection: 'row-reverse' }
    ];

    slState.players.forEach((p, i) => {
        if (i >= slState.playerCount) return; // Leave empty if not enough players

        const corner = document.createElement('div');
        corner.className = 'sl-corner-widget';
        corner.id = `sl-corner-${i}`;
        const pos = cornerPositions[i];
        
        let positionStyle = '';
        if (pos.top) positionStyle += `top:${pos.top};`;
        if (pos.bottom) positionStyle += `bottom:${pos.bottom};`;
        if (pos.left) positionStyle += `left:${pos.left};`;
        if (pos.right) positionStyle += `right:${pos.right};`;
        if (pos.margin) positionStyle += `margin:${pos.margin};`;

        corner.style.cssText = `
            position:absolute; ${positionStyle}
            display:flex; flex-direction:${pos.flexDirection}; align-items:center; gap:8px;
            background:rgba(0,0,0,0.65); padding:8px 12px; border-radius:12px;
            border:2px solid ${p.color}44; z-index:40;
            box-shadow:0 0 15px rgba(0,0,0,0.5);
            transition:all 0.3s ease;
        `;
        
        const isHuman = slState.playerTypes[i] === 'human';

        corner.innerHTML = `
            <div id="sl-crew-card-${i}" style="display:flex; flex-direction:column; align-items:center; min-width:55px;">
                <div class="pawn ${p.cssClass}-p" style="
                    width:clamp(28px,6vw,38px);height:clamp(28px,6vw,38px);
                    font-size:clamp(14px,3vw,20px);position:relative;margin:0;">
                    🛸<div class="engine-flame"></div>
                </div>
                <span style="color:${p.color};font-weight:900;font-size:0.6rem;letter-spacing:0.5px;text-align:center;margin-top:4px;">
                    ${escapeHTML(p.name)}
                </span>
                <span id="sl-pos-${i}" style="
                    color:#aaa;font-size:0.55rem;font-weight:700;
                    background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:4px;margin-top:2px;">
                    BASE
                </span>
                ${isHuman ? '' : '<span style="font-size:0.5rem;color:#888;margin-top:4px;font-weight:bold;">🤖 BOT</span>'}
            </div>
            
            <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                <div id="sl-dice-display-${i}"
                    ${isHuman ? `onclick="rollSLDice()" ontouchend="event.preventDefault();rollSLDice();"` : ''}
                    style="
                    width:46px; height:46px; border-radius:8px;
                    background:radial-gradient(circle at 35% 35%, #2d1080 0%, #0e0530 100%);
                    border:2px solid #7c3aed;
                    box-shadow:0 0 10px rgba(124,58,237,0.4), inset 0 0 6px rgba(124,58,237,0.3);
                    display:grid; grid-template-columns:repeat(3,1fr);
                    grid-template-rows:repeat(3,1fr); padding:4px; gap:2px;
                    transition:all 0.2s ease;
                    ${isHuman ? 'cursor:pointer;' : ''}
                "></div>
            </div>
        `;
        
        layoutWrapper.appendChild(corner);
        renderSLDiceFace(document.getElementById(`sl-dice-display-${i}`), 0);
    });

    // ── Build pawns on board ──────────────────────────────────────────────────
    slState.players.forEach(p => {
        const pawn = document.createElement('div');
        pawn.className = `pawn ${p.cssClass}-p sl-board-pawn`;
        pawn.innerHTML = `🛸<div class="engine-flame"></div>`;
        pawn.style.cssText = `
            position:absolute; width:clamp(20px,4.5vw,30px); height:clamp(20px,4.5vw,30px);
            font-size:clamp(12px,2.5vw,18px); transform:translate(-50%,-50%);
            transition:left 0.45s cubic-bezier(0.25,1,0.5,1), top 0.45s cubic-bezier(0.25,1,0.5,1);
            z-index:10; display:none;
        `;
        p.el = pawn;
        boardContainer.appendChild(pawn);
    });

    // Draw board
    generateSLBoard(boardContainer);

    updateSLTurnIndicator();
    updateSLCrewCards();
}

// ─── Dice Face Renderer ───────────────────────────────────────────────────────
const SL_DOT_PATTERNS = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8]
};

function renderSLDiceFace(el, value) {
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        const pattern = SL_DOT_PATTERNS[value] || [];
        if (pattern.includes(i)) {
            const dot = document.createElement('div');
            dot.style.cssText = `
                width:7px;height:7px;border-radius:50%;
                background:#c084fc;box-shadow:0 0 4px #a855f7;
            `;
            cell.appendChild(dot);
        }
        el.appendChild(cell);
    }
}

// ─── UI Updaters ──────────────────────────────────────────────────────────────
function updateSLTurnIndicator() {
    const ind = document.getElementById('sl-turn-indicator');
    if (!ind) return;

    if (!slState.isPlaying) {
        ind.innerText = 'GAME OVER';
        ind.style.color = '#facc15';
        return;
    }

    const p = slState.players[slState.currentPlayerIndex];
    ind.innerText = `${p.name}'s TURN`;
    ind.style.color = p.color;
    ind.style.textShadow = `0 0 8px ${p.color}`;
    ind.style.borderColor = p.color + '66';
}

function updateSLCrewCards() {
    slState.players.forEach((p, i) => {
        const corner = document.getElementById(`sl-corner-${i}`);
        const posEl = document.getElementById(`sl-pos-${i}`);
        if (!corner || !posEl) return;

        const isActive = (i === slState.currentPlayerIndex && slState.isPlaying);
        corner.style.borderColor = isActive ? p.color : p.color + '44';
        corner.style.background  = isActive ? p.color + '33' : 'rgba(0,0,0,0.65)';
        corner.style.boxShadow   = isActive ? `0 0 15px ${p.color}66` : '0 0 15px rgba(0,0,0,0.5)';

        if (p.finished) {
            posEl.textContent = `#${p.rank} DONE`;
            posEl.style.color = '#facc15';
            posEl.style.background = 'rgba(250,204,21,0.15)';
        } else if (!p.onBoard) {
            posEl.textContent = 'BASE';
            posEl.style.color = '#888';
            posEl.style.background = 'rgba(255,255,255,0.08)';
        } else {
            posEl.textContent = `#${p.pos}`;
            posEl.style.color = p.color;
            posEl.style.background = p.color + '22';
        }
        
        // Style dice to show interactability
        const diceEl = document.getElementById(`sl-dice-display-${i}`);
        if (diceEl && slState.playerTypes[i] === 'human') {
            const canRoll = isActive && !slState.isRolling;
            diceEl.style.opacity = canRoll ? '1' : '0.5';
            diceEl.style.cursor = canRoll ? 'pointer' : 'default';
            diceEl.style.transform = canRoll ? 'scale(1.08)' : 'scale(1)';
            diceEl.style.boxShadow = canRoll
                ? '0 0 16px rgba(124,58,237,0.7), inset 0 0 8px rgba(124,58,237,0.4)'
                : '0 0 10px rgba(124,58,237,0.4), inset 0 0 6px rgba(124,58,237,0.3)';
        }
    });
}

// ─── Roll Logic ───────────────────────────────────────────────────────────────
window.rollSLDice = function() {
    if (!slState.isPlaying || slState.isRolling) return;

    const p = slState.players[slState.currentPlayerIndex];
    if (p.finished) { nextSLTurn(); return; }

    slState.isRolling = true;
    updateSLCrewCards(); // Will disable roll button

    // Animate dice spinning for this specific player's dice
    const diceEl = document.getElementById(`sl-dice-display-${p.id}`);
    let spinCount = 0;
    const spinInterval = setInterval(() => {
        const rnd = Math.floor(Math.random() * 6) + 1;
        if (diceEl) renderSLDiceFace(diceEl, rnd);
        spinCount++;
        if (spinCount >= 8) {
            clearInterval(spinInterval);
        }
    }, 80);

    setTimeout(() => {
        const roll = Math.floor(Math.random() * 6) + 1;
        if (diceEl) {
            renderSLDiceFace(diceEl, roll);
            // Glow on 6
            if (roll === 6) {
                diceEl.style.boxShadow = '0 0 20px #facc15, inset 0 0 10px rgba(250,204,21,0.3)';
                diceEl.style.borderColor = '#facc15';
                setTimeout(() => {
                    diceEl.style.boxShadow = '0 0 10px rgba(124,58,237,0.4), inset 0 0 6px rgba(124,58,237,0.3)';
                    diceEl.style.borderColor = '#7c3aed';
                }, 800);
            }
        }

        p.totalTurns++;

        setTimeout(() => {
            handleSLMove(p, roll);
        }, 400);
    }, 8 * 80 + 80);
};

function triggerSLCanvasExplosion(cellNum, color) {
    const container = document.getElementById('sl-board-container');
    if (!container || !window.particleEngine || !window.particleEngine.activeCanvas) return;
    const { x, y } = getSLCellPercent(cellNum);
    const canvasRect = window.particleEngine.activeCanvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const localX = containerRect.left + (x / 100 * containerRect.width) - canvasRect.left;
    const localY = containerRect.top + (y / 100 * containerRect.height) - canvasRect.top;
    
    for (let i = 0; i < 30; i++) {
        window.particleEngine.addParticle(
            localX,
            localY,
            color || '#7c3aed',
            [3, 8],
            [1.5, 5],
            null,
            0.025,
            'explosion',
            Math.random() > 0.4 ? 'circle' : 'square'
        );
    }
}

function handleSLMove(p, roll) {
    // Need 6 to enter the board
    if (!p.onBoard) {
        if (roll === 6) {
            p.onBoard = true;
            p.pos = 1;
            // Show pawn on board
            if (p.el) p.el.style.display = '';
            
            // Audio feedback
            if (typeof playSynthSound === 'function') {
                playSynthSound(440, 880, 0.25, 'sine');
            }
            if (typeof triggerEmojiReaction === 'function') {
                triggerEmojiReaction('roll_six', p.id);
            }
            
            placeSLPawn(p, () => {
                finishSLMove(p, false);
            });
        } else {
            setTimeout(() => finishSLMove(p, false), 200);
        }
        return;
    }

    // Already on board — move
    let target = p.pos + roll;

    // Bounce-back rule if overshoot 100
    if (target > 100) {
        const over = target - 100;
        target = 100 - over;
        showSLToast(`${p.name} bounced back to ${target}!`, p.color);
        if (typeof playSynthSound === 'function') {
            playSynthSound(300, 150, 0.3, 'sawtooth');
        }
    }

    placeSLPawn(p, () => {
        p.pos = target;
        // Animate to target
        updateSLPawnPosition(p);
        
        // standard landing beep
        if (typeof playSynthSound === 'function') {
            playSynthSound(350, 440, 0.15, 'triangle');
        }
        
        // Confetti if reached 100
        if (target === 100) {
            const container = document.getElementById('sl-board-container');
            if (container) {
                const { x, y } = getSLCellPercent(100);
                const containerRect = container.getBoundingClientRect();
                const targetX = containerRect.left + (x / 100 * containerRect.width);
                const targetY = containerRect.top + (y / 100 * containerRect.height);
                if (typeof triggerConfettiBurst === 'function') {
                    triggerConfettiBurst(targetX, targetY);
                }
            }
            if (typeof playEmojiSFX === 'function') {
                playEmojiSFX('win_game');
            }
        }
        
        setTimeout(() => {
            const boardConfig = SL_BOARDS[slState.selectedBoardIndex];
            // Check rocket / wormhole
            if (boardConfig.rockets[target]) {
                const dest = boardConfig.rockets[target];
                showSLToast(`🚀 ROCKET! ${p.name} blasts from ${target} → ${dest}!`, '#4ade80');
                p.rocketsCaught++;
                
                // Explode at entry
                triggerSLCanvasExplosion(target, '#4ade80');
                if (typeof playEmojiSFX === 'function') {
                    playEmojiSFX('rocket_boost');
                }
                
                setTimeout(() => {
                    p.pos = dest;
                    updateSLPawnPosition(p);
                    // Explode at destination
                    triggerSLCanvasExplosion(dest, '#4ade80');
                    if (typeof playSynthSound === 'function') {
                        playSynthSound(600, 900, 0.25, 'sine');
                    }
                    setTimeout(() => checkSLWin(p), 450);
                }, 500);
            } else if (boardConfig.wormholes[target]) {
                const dest = boardConfig.wormholes[target];
                showSLToast(`🌀 WORMHOLE! ${p.name} falls from ${target} → ${dest}!`, '#c084fc');
                p.wormholesHit++;
                
                // Explode at entry
                triggerSLCanvasExplosion(target, '#c084fc');
                if (typeof playEmojiSFX === 'function') {
                    playEmojiSFX('teleport_wormhole');
                }
                
                setTimeout(() => {
                    p.pos = dest;
                    updateSLPawnPosition(p);
                    // Explode at destination
                    triggerSLCanvasExplosion(dest, '#c084fc');
                    if (typeof playSynthSound === 'function') {
                        playSynthSound(250, 150, 0.35, 'sawtooth');
                    }
                    setTimeout(() => checkSLWin(p), 450);
                }, 500);
            } else {
                checkSLWin(p);
            }
        }, 500);
    }, target);
}

function placeSLPawn(p, callback, targetPos) {
    // For first-time board entry, just place at pos 1
    const pos = targetPos !== undefined ? targetPos : p.pos;
    p.pos = pos;
    if (p.el) p.el.style.display = '';
    updateSLPawnPosition(p);
    setTimeout(callback, 50);
}

function updateSLPawnPosition(p) {
    if (!p.el) return;
    const container = document.getElementById('sl-board-container');
    if (!container) return;

    const { x, y } = getSLCellPercent(p.pos);

    // Slight offset per player to avoid overlap
    const offsets = [
        { dx: -4, dy: -4 },
        { dx:  4, dy: -4 },
        { dx: -4, dy:  4 },
        { dx:  4, dy:  4 }
    ];
    const off = offsets[p.id] || { dx: 0, dy: 0 };

    p.el.style.left = `calc(${x}% + ${off.dx}px)`;
    p.el.style.top  = `calc(${y}% + ${off.dy}px)`;

    // Emit S&L engine trail particles
    if (window.particleEngine && window.particleEngine.activeCanvas) {
        const canvasRect = window.particleEngine.activeCanvas.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const localX = containerRect.left + (x / 100 * containerRect.width) + off.dx - canvasRect.left;
        const localY = containerRect.top + (y / 100 * containerRect.height) + off.dy - canvasRect.top;
        
        for (let i = 0; i < 5; i++) {
            window.particleEngine.addParticle(
                localX,
                localY,
                p.color || '#7c3aed',
                [2, 5],
                [0.5, 2],
                null,
                0.05,
                'trail',
                'circle'
            );
        }
    }
}

function checkSLWin(p) {
    if (p.pos === 100 && !p.finished) {
        p.finished = true;
        slState.finishedPlayers.push(p);
        p.rank = slState.finishedPlayers.length;
        showSLToast(`🏆 ${p.name} REACHED 100! RANK #${p.rank}!`, '#facc15');
    }
    updateSLCrewCards();
    finishSLMove(p, p.pos === 100);
}

function finishSLMove(p, isWin) {
    slState.isRolling = false;
    updateSLCrewCards();

    if (slState.finishedPlayers.length >= slState.players.length - 1) {
        // Game over
        const lastPlayer = slState.players.find(pl => !pl.finished);
        if (lastPlayer) {
            lastPlayer.finished = true;
            slState.finishedPlayers.push(lastPlayer);
            lastPlayer.rank = slState.finishedPlayers.length;
        }
        slState.isPlaying = false;
        updateSLTurnIndicator();
        updateSLCrewCards();
        setTimeout(showSLWinModal, 800);
        return;
    }

    nextSLTurn();
}

function nextSLTurn() {
    let attempts = 0;
    do {
        slState.currentPlayerIndex = (slState.currentPlayerIndex + 1) % slState.players.length;
        attempts++;
    } while (slState.players[slState.currentPlayerIndex].finished && attempts < slState.players.length);

    updateSLTurnIndicator();
    updateSLCrewCards();
    
    // Auto-roll for bots
    const p = slState.players[slState.currentPlayerIndex];
    if (!p.finished && slState.playerTypes[p.id] === 'bot') {
        setTimeout(() => {
            if (slState.isPlaying && !slState.isRolling) {
                rollSLDice();
            }
        }, 1200);
    }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showSLToast(msg, color) {
    const view = document.getElementById('snakes-ladders-view');
    if (!view) return;
    let tc = view.querySelector('.sl-toast-container');
    if (!tc) {
        tc = document.createElement('div');
        tc.className = 'sl-toast-container';
        tc.style.cssText = `
            position:absolute; bottom:10px; left:50%; transform:translateX(-50%);
            z-index:200; pointer-events:none; width:85%; max-width:320px;
            display:flex; flex-direction:column; gap:4px; align-items:center;
        `;
        view.appendChild(tc);
    }
    const toast = document.createElement('div');
    toast.style.cssText = `
        background:rgba(5,10,30,0.92); border:1px solid ${color || '#7c3aed'};
        border-radius:8px; padding:6px 14px; font-size:0.72rem; font-weight:700;
        color:#fff; text-align:center; box-shadow:0 0 10px ${color || '#7c3aed'}55;
        animation:slToastIn 0.3s ease;
    `;
    toast.textContent = msg;
    tc.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 350);
    }, 2800);
}

// ─── Win Modal ────────────────────────────────────────────────────────────────
function showSLWinModal() {
    const modal = document.getElementById('sl-win-modal');
    if (!modal) return;

    const ann = document.getElementById('sl-win-announcement');
    const winner = slState.finishedPlayers[0];
    if (ann && winner) {
        ann.innerText = `Pilot ${winner.name} reached Sector 100!`;
        ann.style.color = winner.color;
    }

    if (winner && typeof registerMatchCompletion === 'function') {
        registerMatchCompletion(winner.name, winner.id, true);
    }

    const statsContainer = document.getElementById('sl-stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <table style="width:100%;border-collapse:collapse;color:#fff;font-size:0.85rem;text-align:left;">
                <tr style="border-bottom:1px solid rgba(255,255,255,0.2);">
                    <th style="padding:4px;">Rank</th>
                    <th style="padding:4px;">Pilot</th>
                    <th style="padding:4px;text-align:center;">Turns</th>
                    <th style="padding:4px;text-align:center;">🚀</th>
                    <th style="padding:4px;text-align:center;">🌀</th>
                </tr>
                ${slState.finishedPlayers.map(p => `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                        <td style="padding:4px;font-weight:900;">#${p.rank}</td>
                        <td style="padding:4px;color:${p.color};font-weight:900;">${escapeHTML(p.name)}</td>
                        <td style="padding:4px;text-align:center;">${p.totalTurns}</td>
                        <td style="padding:4px;text-align:center;color:#4ade80;">${p.rocketsCaught}</td>
                        <td style="padding:4px;text-align:center;color:#c084fc;">${p.wormholesHit}</td>
                    </tr>
                `).join('')}
            </table>
        `;
    }
    modal.classList.add('active');
}

// ─── CSS injection for SL toast animation ────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('sl-anim-styles')) {
    const s = document.createElement('style');
    s.id = 'sl-anim-styles';
    s.innerHTML = `
        @keyframes slToastIn {
            from { opacity:0; transform:translateY(8px); }
            to   { opacity:1; transform:translateY(0); }
        }
    `;
    document.head.appendChild(s);
}

// ─── Default init on page load ────────────────────────────────────────────────
setTimeout(() => {
    if (document.getElementById('sl-player-slot-config')) {
        renderSLPlayerSlots();
    }
}, 1000);
