// Live Twinkling Stars Creator
function generateStars() {
    const field = document.getElementById('starfield');
    if (!field) return;
    
    // Clear existing stars first to prevent accumulation/doubling on density resets
    field.innerHTML = '';
    
    const colors = ['#ffffff', '#ffffff', '#ffffff', '#ffb300', '#ffb300', '#ff6d3a', '#e040fb'];
    
    for (let i = 0; i < 130; i++) {
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
    setInterval(() => {
        if (document.hidden) return;
        const parent = document.getElementById('starfield');
        if (!parent) return;
        const line = document.createElement('div');
        line.className = 'shooting-star';
        line.style.top = Math.random() * 40 + 'vh';
        line.style.left = Math.random() * 60 + 40 + 'vw';
        line.style.animation = `shoot ${Math.random() * 1.5 + 1.2}s cubic-bezier(0.25, 1, 0.5, 1) forwards`;
        parent.appendChild(line);
        setTimeout(() => line.remove(), 3000);
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

// Trigger particle explosion at specific visual coordinate or board cell coordinate
function triggerParticleExplosion(x, y, color) {
    let targetX = 0;
    let targetY = 0;

    // Check if x and y represent grid coordinates (bounds [0, 14])
    if (Math.abs(x) <= 15 && Math.abs(y) <= 15) {
        const cell = document.getElementById(`cell-${x}-${y}`) || document.getElementById(`cell-${y}-${x}`);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
        } else {
            // Default center of board if element is missing
            const board = document.getElementById('board');
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

    const container = document.body;
    const particleCount = 24;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = targetX + 'px';
        particle.style.top = targetY + 'px';
        
        // Random particle dimensions
        const size = Math.random() * 6 + 4;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '999999';

        // Apply glow style
        const resolvedColor = color || 'var(--cyan)';
        particle.style.backgroundColor = resolvedColor;
        particle.style.boxShadow = `0 0 10px ${resolvedColor}, 0 0 3px ${resolvedColor}`;

        // Math for random motion direction and speed
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 110 + 40; // pixel velocity
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        container.appendChild(particle);

        const startTime = performance.now();
        const duration = Math.random() * 450 + 350; // milliseconds

        function stepParticle(time) {
            if (document.hidden) {
                setTimeout(() => requestAnimationFrame(stepParticle), 250);
                return;
            }
            const elapsed = time - startTime;
            if (elapsed >= duration) {
                particle.remove();
                return;
            }

            const pct = elapsed / duration;
            const currentX = targetX + (vx * pct);
            // Smooth gravitational drag downward
            const currentY = targetY + (vy * pct) + (35 * pct * pct);

            particle.style.transform = `translate3d(${currentX - targetX}px, ${currentY - targetY}px, 0) scale(${1 - pct * 0.75})`;
            particle.style.opacity = 1 - pct;

            requestAnimationFrame(stepParticle);
        }

        requestAnimationFrame(stepParticle);
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
    const avatar = charSpan ? charSpan.innerText : '👽';
    
    const rawEmoji = EMOJI_MAP[type] || '👽';
    const reactionEmotes = rawEmoji.replace(/👽/g, '');
    
    div.innerHTML = `
        <span class="emoji-bubble-avatar" style="text-shadow: 0 0 8px var(--${playerColor});">${avatar}</span>
        <span class="emoji-bubble-text">${reactionEmotes}</span>
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
        const colors = ['#ffd600', '#00e676', '#ff4081', '#448aff', '#e040fb'];
        colors.forEach((c, idx) => {
            setTimeout(() => {
                triggerParticleExplosion(targetX, targetY, c);
            }, idx * 100);
        });
    }

    // Auto clean up
    setTimeout(() => {
        div.remove();
    }, 1200);
}

if (typeof window !== 'undefined') {
    window.triggerEmojiReaction = triggerEmojiReaction;
    window.checkNearVictory = checkNearVictory;
}

