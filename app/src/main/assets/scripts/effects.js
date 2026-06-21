// effects.js

// Live Twinkling Stars Creator
function generateStars() {
    const field = document.getElementById('starfield');
    if (!field) return;
    
    // Clear existing stars first to prevent accumulation/doubling on density resets
    field.innerHTML = '';
    
    // Retrieve density configuration and scale star counts down for performance (prevent heating)
    const densityVal = parseInt(localStorage.getItem('cosmic_star_density') || '50', 10);
    const starCount = Math.floor(densityVal * 0.7) + 15; 
    
    const colors = ['#ffffff', '#ffffff', '#ffffff', '#ffb300', '#ffb300', '#ff6d3a', '#e040fb'];
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 0.5;
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        star.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        star.style.animation = `twinkle ${Math.random() * 3 + 1.5}s infinite ease-in-out`;
        field.appendChild(star);
    }
}

// Randomly spawning shooting stars loop
function runShootingStars() {
    const persistentSetInterval = window.__originalSetInterval || setInterval;
    const persistentSetTimeout = window.__originalSetTimeout || setTimeout;
    
    persistentSetInterval(() => {
        if (document.hidden) return;
        const parent = document.getElementById('starfield');
        if (!parent) return;
        const line = document.createElement('div');
        line.className = 'shooting-star';
        line.style.top = Math.random() * 40 + 'vh';
        line.style.left = Math.random() * 60 + 40 + 'vw';
        line.style.animation = `shoot ${Math.random() * 1.5 + 1.2}s cubic-bezier(0.25, 1, 0.5, 1) forwards`;
        parent.appendChild(line);
        persistentSetTimeout(() => line.remove(), 3000);
    }, 6000);
}

// Display beautiful alerts/toasts with queueing support
function raiseToast(message, icon = "📢") {
    const parent = document.getElementById('toast-container');
    if (!parent) return;
    
    // Create new toast element
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    
    // Append to container
    parent.appendChild(t);
    
    // Manage toast queue: max 3 visible toasts. Oldest is removed immediately.
    while (parent.children.length > 3) {
        const oldest = parent.firstElementChild;
        if (oldest) {
            oldest.style.animation = 'fadeOutHUD 0.15s forwards';
            oldest.style.opacity = '0';
            oldest.remove();
        }
    }
    
    // Automatically fade and remove after its lifespan
    setTimeout(() => { 
        if (t.parentNode === parent) {
            t.remove();
        }
    }, 6100);
}

// ==========================================================================
// HIGH-PERFORMANCE CANVAS PARTICLE SYSTEM ENGINE
// ==========================================================================
class CanvasParticleEngine {
    constructor() {
        this.particles = [];
        this.activeCanvas = null;
        this.ctx = null;
        this.animationId = null;
        
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.resizeCanvas());
        }
    }
    
    setCanvas(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        this.activeCanvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resizeCanvas();
        // Loop will start dynamically when particles are added
    }
    
    resizeCanvas() {
        if (!this.activeCanvas) return;
        const rect = this.activeCanvas.getBoundingClientRect();
        this.activeCanvas.width = rect.width;
        this.activeCanvas.height = rect.height;
    }
    
    addParticle(x, y, color, sizeRange = [3, 8], speedRange = [1, 4], angle = null, decay = 0.02, type = 'star', shape = 'circle') {
        const particleLevel = localStorage.getItem('cosmic_particle_level') || 'high';
        if (particleLevel === 'low') {
            if (Math.random() > 0.3) return;
        } else if (particleLevel === 'medium') {
            if (Math.random() > 0.6) return;
        }

        const rad = angle !== null ? angle : Math.random() * Math.PI * 2;
        const speed = Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0];
        
        this.particles.push({
            x: x,
            y: y,
            vx: Math.cos(rad) * speed,
            vy: Math.sin(rad) * speed,
            alpha: 1,
            decay: Math.random() * 0.015 + decay,
            size: Math.random() * (sizeRange[1] - sizeRange[0]) + sizeRange[0],
            color: color,
            type: type, // 'trail', 'explosion', 'confetti', 'star'
            shape: shape, // 'circle', 'square', 'star'
            gravity: type === 'confetti' ? 0.15 : (type === 'explosion' ? 0.08 : 0),
            spin: (Math.random() - 0.5) * 0.2,
            angle: Math.random() * Math.PI * 2
        });

        if (!this.animationId) {
            this.loop();
        }
    }
    
    loop() {
        this.update();
        this.draw();
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.loop());
        } else {
            // Clean/clear canvas one final time and stop loop to save CPU/GPU cycles
            if (this.ctx && this.activeCanvas) {
                this.ctx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
            }
            this.animationId = null;
        }
    }
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            p.angle += p.spin;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw() {
        if (!this.ctx || !this.activeCanvas) return;
        const ctx = this.ctx;
        const canvas = this.activeCanvas;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.shadowBlur = p.type === 'trail' ? 8 : 4;
            ctx.shadowColor = p.color;
            
            if (p.shape === 'circle') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'square') {
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else if (p.shape === 'star') {
                this.drawStar(ctx, 0, 0, 5, p.size, p.size / 2);
            }
            ctx.restore();
        }
    }
    
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}

// Global engine instantiator
if (typeof window !== 'undefined') {
    window.particleEngine = new CanvasParticleEngine();
}

// Trigger particle explosion at specific visual coordinate or board cell coordinate
function triggerParticleExplosion(x, y, color) {
    let targetX = 0;
    let targetY = 0;

    // Check if x and y represent grid coordinates (bounds [0, 15])
    if (Math.abs(x) <= 15 && Math.abs(y) <= 15) {
        const cell = document.getElementById(`cell-${x}-${y}`) || document.getElementById(`cell-${y}-${x}`);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
        } else {
            // Default center of board if element is missing
            const board = document.getElementById('game-board');
            if (board) {
                const rect = board.getBoundingClientRect();
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
            } else {
                targetX = window.innerWidth / 2;
                targetY = window.innerHeight / 2;
            }
        }
    } else {
        // x and y are absolute page pixel coordinates
        targetX = x;
        targetY = y;
    }

    if (window.particleEngine && window.particleEngine.activeCanvas) {
        const canvasRect = window.particleEngine.activeCanvas.getBoundingClientRect();
        const localX = targetX - canvasRect.left;
        const localY = targetY - canvasRect.top;
        
        const resolvedColor = color || 'var(--cyan)';
        const particleCount = 28;

        for (let i = 0; i < particleCount; i++) {
            window.particleEngine.addParticle(
                localX,
                localY,
                resolvedColor,
                [3, 8],     // size range
                [1.5, 5],   // speed range
                null,       // random angle
                0.025,      // decay rate
                'explosion',// type
                Math.random() > 0.4 ? 'circle' : 'square' // shape
            );
        }
    }
}

// Trigger pawn smoke trail emitter on movement cell boundaries
function triggerPawnSmokeTrail(row, col, color) {
    const cell = document.getElementById(`cell-${row}-${col}`) || document.getElementById(`cell-${col}-${row}`);
    if (cell && window.particleEngine && window.particleEngine.activeCanvas) {
        const rect = cell.getBoundingClientRect();
        const canvasRect = window.particleEngine.activeCanvas.getBoundingClientRect();
        const localX = (rect.left + rect.width / 2) - canvasRect.left;
        const localY = (rect.top + rect.height / 2) - canvasRect.top;
        
        for (let i = 0; i < 4; i++) {
            window.particleEngine.addParticle(
                localX,
                localY,
                color || 'var(--cyan)',
                [2, 5],     // size
                [0.5, 2],   // speed
                null,       // angle
                0.05,       // decay
                'trail',    // type
                'circle'    // shape
            );
        }
    }
}

// Trigger Confetti Fountain burst celebration on docking/victory
function triggerConfettiBurst(x, y) {
    if (window.particleEngine && window.particleEngine.activeCanvas) {
        const canvasRect = window.particleEngine.activeCanvas.getBoundingClientRect();
        const localX = x - canvasRect.left;
        const localY = y - canvasRect.top;
        const colors = ['#ffd600', '#00e676', '#ff4081', '#448aff', '#e040fb'];
        
        for (let i = 0; i < 50; i++) {
            const pColor = colors[Math.floor(Math.random() * colors.length)];
            window.particleEngine.addParticle(
                localX,
                localY,
                pColor,
                [4, 10], // size range
                [2, 7],  // speed range
                Math.random() * Math.PI * 2, // angle
                0.015,   // decay
                'confetti',
                Math.random() > 0.5 ? 'square' : 'star'
            );
        }
    }
}

// Automatically hook system events to trigger particle burst animations on capture and docking
function hookGameEventsForParticles() {
    if (typeof resolveCaptures === 'function' && !resolveCaptures._hooked) {
        const originalResolveCaptures = resolveCaptures;
        resolveCaptures = function(playerIdx, pawnIdx, finalPosition, coord) {
            const res = originalResolveCaptures(playerIdx, pawnIdx, finalPosition, coord);
            if (res.captureOccurred && coord) {
                const activeP = players[playerIdx];
                const pColor = activeP ? `var(--${activeP.color})` : 'var(--cyan)';
                // Trigger precise capture blast at the destination coordinate
                triggerParticleExplosion(coord[0], coord[1], pColor);
            }
            return res;
        };
        resolveCaptures._hooked = true;
    }
    
    if (typeof checkFinish === 'function' && !checkFinish._hooked) {
        const originalCheckFinish = checkFinish;
        checkFinish = function(playerIdx, finalPosition) {
            const res = originalCheckFinish(playerIdx, finalPosition);
            if (res.isFinish) {
                const activeP = players[playerIdx];
                const pColor = activeP ? `var(--${activeP.color})` : 'var(--green)';
                // Position particle burst on the Mother Ship at row 7, column 7
                triggerParticleExplosion(7, 7, pColor);
                if (typeof triggerEmojiReaction === 'function') {
                    triggerEmojiReaction('reach_home', playerIdx, 7, 7);
                }
            }
            return res;
        };
        checkFinish._hooked = true;
    }
}

// Initialize hook attachments once everything is loaded
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', hookGameEventsForParticles);
    setTimeout(hookGameEventsForParticles, 500);
    setTimeout(hookGameEventsForParticles, 1500);
    setTimeout(hookGameEventsForParticles, 3000);
}

// Style injection for animated emojis and particles
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.id = 'emoji-reaction-styles';
    style.innerHTML = `
        @keyframes emojiPopUp {
            0% { transform: translate(-50%, 15px) scale(0.3); opacity: 0; }
            25% { transform: translate(-50%, -10px) scale(1.1); opacity: 1; }
            75% { transform: translate(-50%, -20px) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%, -35px) scale(0.7); opacity: 0; }
        }
        @keyframes emojiPopDown {
            0% { transform: translate(-50%, -15px) scale(0.3); opacity: 0; }
            25% { transform: translate(-50%, 10px) scale(1.1); opacity: 1; }
            75% { transform: translate(-50%, 20px) scale(1.0); opacity: 1; }
            100% { transform: translate(-50%, 35px) scale(0.7); opacity: 0; }
        }
        @keyframes emojiShiver {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            10%, 30%, 50%, 70%, 90% { transform: translate(-54%, -50%) scale(1.1) rotate(-4deg); opacity: 1; }
            20%, 40%, 60%, 80% { transform: translate(-46%, -50%) scale(1.1) rotate(4deg); opacity: 1; }
            95% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
        }
        @keyframes emojiWarp {
            0% { transform: translate(-50%, -50%) scale(0.3) rotate(0deg); opacity: 0; }
            20% { transform: translate(-50%, -50%) scale(1.1) rotate(360deg); opacity: 1; }
            80% { transform: translate(-50%, -50%) scale(1.0) rotate(540deg); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(0) rotate(1080deg); opacity: 0; }
        }
        @keyframes tearFall {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), 40px) scale(0.5); opacity: 0; }
        }
        @keyframes sparkleOut {
            0% { transform: translate(0, 0) scale(0.2) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(1) rotate(180deg); opacity: 0; }
        }
        
        .emoji-reaction-bubble {
            position: fixed;
            pointer-events: none;
            transition: opacity 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(18, 5, 38, 0.95);
            border-radius: 20px;
            padding: 4px 10px;
            gap: 6px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.6);
            z-index: 1000000;
        }
        .emoji-reaction-bubble.animate-pop-up {
            animation: emojiPopUp 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .emoji-reaction-bubble.animate-pop-down {
            animation: emojiPopDown 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .emoji-reaction-bubble.animate-shiver {
            animation: emojiShiver 1.1s ease-in-out forwards;
        }
        .emoji-reaction-bubble.animate-warp {
            animation: emojiWarp 1.1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .emoji-bubble-avatar {
            font-size: 1.2rem;
        }
        .emoji-bubble-text {
            font-size: 1.4rem;
        }
        .tear-particle {
            position: fixed;
            font-size: 0.8rem;
            pointer-events: none;
            z-index: 1000001;
            animation: tearFall 0.8s linear forwards;
        }
        .sparkle-particle {
            position: fixed;
            font-size: 0.7rem;
            pointer-events: none;
            z-index: 1000001;
            animation: sparkleOut 0.8s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
}

const REACTION_IMAGE_MAP = {
    pawn_captured: 'images/generated/emojis/emoji_reaction_cry.png',
    capture_opponent: 'images/generated/emojis/emoji_reaction_smirk.png',
    roll_six: 'images/generated/emojis/emoji_reaction_starstruck.png',
    safe_zone: 'images/generated/emojis/emoji_reaction_relieved.png',
    reach_home: 'images/generated/emojis/emoji_reaction_party.png',
    lose_turn: 'images/generated/emojis/emoji_reaction_exhausted.png',
    invalid_move: 'images/generated/emojis/emoji_reaction_thinking.png',
    shield_activated: 'images/generated/emojis/emoji_reaction_shield.png',
    frozen_by_crystal: 'images/generated/emojis/emoji_reaction_frozen.png',
    rocket_boost: 'images/generated/emojis/emoji_reaction_rocket.png',
    teleport_wormhole: 'images/generated/emojis/emoji_reaction_warp.png',
    near_victory: 'images/generated/emojis/emoji_reaction_smirk.png',
    win_game: 'images/generated/emojis/emoji_reaction_crown.png',
    lose_game: 'images/generated/emojis/emoji_reaction_dizzy.png'
};

const FLOATING_EMOTE_MAP = {
    '😎': 'images/generated/emojis/emote_alien_cool.png',
    '🔥': 'images/generated/emojis/emote_fire.png',
    '😭': 'images/generated/emojis/emoji_reaction_cry.png',
    '🤪': 'images/generated/emojis/emote_lol.png',
    '💥': 'images/generated/emojis/emote_thunder.png'
};

const EMOJI_MAP = {
    pawn_captured: '👽😭',
    capture_opponent: '👽😎',
    roll_six: '👽🤩',
    safe_zone: '👽😌',
    reach_home: '👽🥳',
    lose_turn: '👽😫',
    invalid_move: '👽🤔',
    shield_activated: '👽🛡️',
    frozen_by_crystal: '👽🥶',
    rocket_boost: '👽🚀',
    teleport_wormhole: '👽🌀',
    near_victory: '👽😏',
    win_game: '👽🤩🥳👑',
    lose_game: '👽😭😵'
};

function checkNearVictory(playerIdx) {
    if (typeof state === 'undefined' || !state.pawnPositions || !state.pawnPositions[playerIdx]) return false;
    const positions = state.pawnPositions[playerIdx];
    const finishPos = getFinishPos();
    const homeStart = getHomeStartPos();
    const finishedCount = positions.filter(pos => pos === finishPos).length;
    const totalPawns = positions.length;
    
    if (finishedCount === totalPawns - 1) {
        const lastPawnIdx = positions.findIndex(pos => pos < finishPos);
        if (lastPawnIdx !== -1) {
            const pos = positions[lastPawnIdx];
            if (pos >= homeStart && pos < finishPos) {
                return true;
            }
        }
    }
    return false;
}

function triggerEmojiReaction(type, playerIdx, xCoord, yCoord) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let panelFound = false;

    if (playerIdx !== undefined && playerIdx !== null && playerIdx >= 0 && playerIdx < 4) {
        const panel = document.getElementById('panel-' + playerIdx);
        if (panel) {
            const rect = panel.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            if (playerIdx === 0 || playerIdx === 1) {
                targetY = rect.top - 20; // just above panel
            } else {
                targetY = rect.bottom + 20; // just below panel
            }
            panelFound = true;
        }
    }

    if (!panelFound && xCoord !== undefined && yCoord !== undefined && Math.abs(xCoord) <= 15 && Math.abs(yCoord) <= 15) {
        const cell = document.getElementById(`cell-${xCoord}-${yCoord}`) || document.getElementById(`cell-${yCoord}-${xCoord}`);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
        }
    }

    const container = document.body;
    const div = document.createElement('div');
    div.className = `emoji-reaction-bubble ${type}`;
    
    const activeP = (typeof players !== 'undefined' && players[playerIdx]) ? players[playerIdx] : null;
    const playerColor = activeP ? activeP.color : 'cyan';
    const charSpan = document.getElementById('player-char-' + playerIdx);
    const avatar = charSpan ? charSpan.innerHTML : '👽';
    
    const reactionImage = REACTION_IMAGE_MAP[type];
    let bubbleTextHTML = '';
    if (reactionImage) {
        bubbleTextHTML = `<img src="${reactionImage}" style="width: 24px; height: 24px; object-fit: contain; vertical-align: middle;" />`;
    } else {
        const rawEmoji = EMOJI_MAP[type] || '👽';
        const reactionEmotes = rawEmoji.replace(/👽/g, '');
        bubbleTextHTML = reactionEmotes;
    }
    
    div.innerHTML = `
        <span class="emoji-bubble-avatar" style="text-shadow: 0 0 8px var(--${playerColor});">${avatar}</span>
        <span class="emoji-bubble-text">${bubbleTextHTML}</span>
    `;
    
    let animClass = 'animate-pop-up';
    if (['pawn_captured', 'lose_turn', 'invalid_move', 'frozen_by_crystal'].includes(type)) {
        animClass = 'animate-shiver';
    } else if (['teleport_wormhole', 'rocket_boost'].includes(type)) {
        animClass = 'animate-warp';
    } else {
        if (playerIdx === 2 || playerIdx === 3) {
            animClass = 'animate-pop-down';
        }
    }
    div.classList.add(animClass);

    div.style.cssText = `
        position: fixed;
        left: ${targetX}px;
        top: ${targetY}px;
        border: 2px solid var(--${playerColor});
        box-shadow: 0 0 10px var(--${playerColor}), inset 0 0 5px var(--${playerColor}), 0 4px 15px rgba(0, 0, 0, 0.6);
    `;

    container.appendChild(div);

    // Play SFX
    if (typeof playEmojiSFX === 'function') {
        playEmojiSFX(type);
    }

    // Special animation overlays
    if (type === 'pawn_captured') {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const tear = document.createElement('div');
                tear.className = 'tear-particle';
                tear.innerText = '💧';
                tear.style.left = (targetX + (Math.random() * 20 - 10)) + 'px';
                tear.style.top = (targetY - 10) + 'px';
                const tx = (Math.random() * 40 - 20) + 'px';
                tear.style.setProperty('--tx', tx);
                container.appendChild(tear);
                setTimeout(() => tear.remove(), 800);
            }, i * 120);
        }
    }
    else if (['roll_six', 'reach_home', 'win_game', 'near_victory'].includes(type)) {
        for (let i = 0; i < 8; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle-particle';
            sparkle.innerText = ['✨', '⭐', '💫'][Math.floor(Math.random() * 3)];
            sparkle.style.left = targetX + 'px';
            sparkle.style.top = targetY + 'px';
            
            const angle = (i / 8) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
            const dist = Math.random() * 50 + 40;
            const tx = (Math.cos(angle) * dist) + 'px';
            const ty = (Math.sin(angle) * dist) + 'px';
            sparkle.style.setProperty('--tx', tx);
            sparkle.style.setProperty('--ty', ty);
            
            container.appendChild(sparkle);
            setTimeout(() => sparkle.remove(), 800);
        }
    }

    if (type === 'reach_home' || type === 'win_game') {
        // Trigger high premium confetti burst celebration
        triggerConfettiBurst(targetX, targetY);
    }

    // Auto clean up
    setTimeout(() => {
        div.remove();
    }, 1200);
}

// Floating reaction emote triggering
function triggerFloatingEmote(emoji, senderPlayerIdx = null) {
    if (senderPlayerIdx === null) {
        if (typeof window.Multiplayer !== 'undefined' && window.Multiplayer.isOnline) {
            senderPlayerIdx = window.Multiplayer.mySlotIdx;
        } else {
            senderPlayerIdx = (typeof state !== 'undefined') ? state.activePlayer : 0;
        }
    }
    
    // Send over multiplayer if local action
    if (typeof window.Multiplayer !== 'undefined' && window.Multiplayer.isOnline && senderPlayerIdx === window.Multiplayer.mySlotIdx) {
        window.Multiplayer.sendEmote(emoji);
    }
    
    const emoteEl = document.createElement('div');
    emoteEl.className = 'floating-emote';
    
    const imageSrc = FLOATING_EMOTE_MAP[emoji];
    if (imageSrc) {
        emoteEl.innerHTML = `<img src="${imageSrc}" style="width: 32px; height: 32px; object-fit: contain;" />`;
    } else {
        emoteEl.textContent = emoji;
    }
    
    const driftX = (Math.random() * 80 - 40) + 'px';
    emoteEl.style.setProperty('--drift-x', driftX);
    
    let startX = window.innerWidth / 2;
    let startY = window.innerHeight / 2;
    
    if (senderPlayerIdx !== null && senderPlayerIdx >= 0 && senderPlayerIdx < 4) {
        const panel = document.getElementById('panel-' + senderPlayerIdx);
        if (panel) {
            const rect = panel.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
        }
    }
    
    emoteEl.style.left = startX + 'px';
    emoteEl.style.top = startY + 'px';
    
    document.body.appendChild(emoteEl);
    
    if (typeof playSynthSound === 'function') {
        playSynthSound(600 + Math.random() * 200, 1000 + Math.random() * 300, 0.25, 'sine');
    }
    
    setTimeout(() => {
        emoteEl.remove();
    }, 2500);
}

// Map holographic emote callback from network
window.showHolographicEmote = function(slotIdx, emoji) {
    triggerFloatingEmote(emoji, slotIdx);
};

if (typeof window !== 'undefined') {
    window.triggerEmojiReaction = triggerEmojiReaction;
    window.checkNearVictory = checkNearVictory;
    window.triggerFloatingEmote = triggerFloatingEmote;
    window.triggerPawnSmokeTrail = triggerPawnSmokeTrail;
    window.triggerParticleExplosion = triggerParticleExplosion;
    window.triggerConfettiBurst = triggerConfettiBurst;
}
