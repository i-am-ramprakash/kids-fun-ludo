// Nebula Flight Run (Arcade Asteroid/Meteor Dodger)
// Self-contained game state and canvas loop

(function() {
    let canvas, ctx;
    let gameActive = false;
    let score = 0;
    let highScore = 0;
    let animationFrameId = null;

    // Game Elements
    let player = {
        x: 180,
        y: 320,
        width: 32,
        height: 20,
        speed: 8,
        targetX: 180
    };

    let asteroids = [];
    let particles = [];
    let stars = [];
    let frameCount = 0;
    let spawnRate = 35; // Frames between asteroid spawn
    let asteroidSpeedMultiplier = 1.0;

    // Initialize high score from local storage
    if (typeof localStorage !== 'undefined') {
        highScore = parseInt(localStorage.getItem('cosmic_dodger_high') || '0', 10);
    }

    window.openNebulaFlightRun = function() {
        if (typeof navigateTo === 'function') {
            navigateTo('cosmic-dodger-view');
        }
        const hudToggle = document.getElementById('global-hud-toggle');
        if (hudToggle) hudToggle.style.display = 'none';
        initDodgerGame();
    };

    function initDodgerGame() {
        canvas = document.getElementById('dodger-canvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        
        // Dynamically size canvas to fill its container (fullscreen layout)
        function resizeDodgerCanvas() {
            const wrap = canvas.parentElement;
            if (!wrap) return;
            const dpr = window.devicePixelRatio || 1;
            const w = wrap.clientWidth  || window.innerWidth;
            const h = wrap.clientHeight || window.innerHeight;
            canvas.width  = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            canvas.style.width  = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(1,0,0,1,0,0);
            ctx.scale(dpr, dpr);
            // Update player position reference to new dimensions
            player.x = w / 2;
            player.targetX = player.x;
            player.y = h - 120;
        }
        resizeDodgerCanvas();
        window._dodgerResize = resizeDodgerCanvas;

        // Load High Score to UI
        const highEl = document.getElementById('dodger-high');
        if (highEl) highEl.textContent = highScore;

        const scoreEl = document.getElementById('dodger-score');
        if (scoreEl) scoreEl.textContent = '0';

        // Show start overlay
        const overlay = document.getElementById('dodger-overlay');
        if (overlay) overlay.style.display = 'flex';

        const titleEl = document.getElementById('dodger-overlay-title');
        if (titleEl) titleEl.textContent = "READY PILOT?";

        const textEl = document.getElementById('dodger-overlay-text');
        if (textEl) textEl.textContent = "Slide finger left/right anywhere on screen to dodge descending meteors and collect golden anomaly stars!";

        // Reset game state
        asteroids = [];
        particles = [];
        score = 0;
        asteroidSpeedMultiplier = 1.0;
        spawnRate = 35;

        // Set up interactive click/drag/touch handlers on the whole parent wrap
        const wrap2 = canvas.parentElement || canvas;
        wrap2.removeEventListener('touchmove', handleInput);
        wrap2.removeEventListener('touchstart', handleInput);
        wrap2.removeEventListener('mousemove', handleInput);
        wrap2.removeEventListener('pointerdown', handleInput);
        wrap2.addEventListener('touchmove', handleInput, { passive: false });
        wrap2.addEventListener('touchstart', handleInput, { passive: false });
        wrap2.addEventListener('mousemove', handleInput);
        wrap2.addEventListener('pointerdown', handleInput);

        // Pre-populate background stars relative to canvas logical size
        const lw = canvas.width / (window.devicePixelRatio || 1);
        const lh = canvas.height / (window.devicePixelRatio || 1);
        stars = [];
        for (let i = 0; i < 45; i++) {
            stars.push({
                x: Math.random() * lw,
                y: Math.random() * lh,
                size: Math.random() * 2 + 0.5,
                speed: Math.random() * 1.5 + 0.5
            });
        }

        // Render initial passive frame
        draw();
    }

    function handleInput(e) {
        if (!gameActive) return;
        e.preventDefault();

        // Resolve canvas logical dimensions accounting for DPR
        const dpr = window.devicePixelRatio || 1;
        const logicalW = canvas.width / dpr;

        let clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        // Convert page coordinates to canvas logical space
        const rect = canvas.getBoundingClientRect();
        const relativeX = ((clientX - rect.left) / rect.width) * logicalW;
        player.targetX = Math.max(20, Math.min(logicalW - 20, relativeX));
    }

    window.startDodgerGame = function() {
        if (gameActive) return;

        gameActive = true;
        score = 0;
        asteroids = [];
        particles = [];
        asteroidSpeedMultiplier = 1.0;
        spawnRate = 35;

        const overlay = document.getElementById('dodger-overlay');
        if (overlay) overlay.style.display = 'none';

        if (typeof playSynthSound === 'function') {
            playSynthSound(520, 100, 0.4, 'sine');
            setTimeout(() => playSynthSound(780, 150, 0.4, 'sine'), 120);
        }

        // Reset Global turning epoch
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        animationFrameId = requestAnimationFrame(updateLoop);
    };

    window.stopDodgerGame = function() {
        gameActive = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        const hudToggle = document.getElementById('global-hud-toggle');
        if (hudToggle) hudToggle.style.display = '';
    };

    function updateLoop() {
        if (!gameActive) return;

        frameCount++;

        // Smoothly interpolate player X toward targetX
        player.x += (player.targetX - player.x) * 0.22;

        // Move Background Stars using logical canvas dimensions
        const dprRef = window.devicePixelRatio || 1;
        const logH = canvas.height / dprRef;
        const logW = canvas.width / dprRef;
        stars.forEach(s => {
            s.y += s.speed;
            if (s.y > logH) {
                s.y = 0;
                s.x = Math.random() * logW;
            }
        });

        // Spawn Asteroids / Anomaly Gold Cells
        if (frameCount % spawnRate === 0) {
            const dpr2 = window.devicePixelRatio || 1;
            const lw2 = canvas.width / dpr2;
            const isGoldAnomaly = Math.random() < 0.25;
            asteroids.push({
                x: Math.random() * (lw2 - 30) + 15,
                y: -20,
                radius: isGoldAnomaly ? 8 : (Math.random() * 12 + 8),
                speed: (Math.random() * 3 + 2.5) * asteroidSpeedMultiplier,
                isGold: isGoldAnomaly,
                pulse: 0
            });
        }

        // Scale difficulty slowly
        if (frameCount % 450 === 0) {
            asteroidSpeedMultiplier += 0.12;
            spawnRate = Math.max(15, spawnRate - 3);
        }

        // Update Asteroids / Anomaly items
        for (let i = asteroids.length - 1; i >= 0; i--) {
            const ast = asteroids[i];
            ast.y += ast.speed;

            if (ast.isGold) {
                ast.pulse += 0.15;
            }

            // Check Collision with player UFO
            const dist = Math.hypot(ast.x - player.x, ast.y - player.y);
            const playerCollisionRadius = player.width / 2;

            if (dist < ast.radius + playerCollisionRadius - 2) {
                if (ast.isGold) {
                    // Harvest gold anomaly star!
                    score += 150;
                    const scoreEl = document.getElementById('dodger-score');
                    if (scoreEl) scoreEl.textContent = score;

                    // Trigger cool particle burst
                    createParticleBurst(ast.x, ast.y, '#ffd600', 12);

                    if (typeof playSynthSound === 'function') {
                        playSynthSound(980, 80, 0.35, 'sine');
                    }

                    // Remove collected anomaly
                    asteroids.splice(i, 1);
                } else {
                    // CRASHED! GAME OVER
                    gameOver();
                    return;
                }
                continue;
            }

            // Remove out of bounds
            const dpr3 = window.devicePixelRatio || 1;
            const lh3 = canvas.height / dpr3;
            if (ast.y > lh3 + 20) {
                if (!ast.isGold) {
                    // Gain a tiny point for dodging a meteor
                    score += 10;
                    const scoreEl = document.getElementById('dodger-score');
                    if (scoreEl) scoreEl.textContent = score;
                }
                asteroids.splice(i, 1);
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }

        // Draw everything
        draw();

        animationFrameId = requestAnimationFrame(updateLoop);
    }

    function createParticleBurst(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                life: 1.0,
                size: Math.random() * 3 + 1
            });
        }
    }

    function draw() {
        const dpr4 = window.devicePixelRatio || 1;
        const lw4 = canvas.width / dpr4;
        const lh4 = canvas.height / dpr4;
        ctx.clearRect(0, 0, lw4, lh4);

        // 1. Draw starfield background
        ctx.fillStyle = '#07030e';
        ctx.fillRect(0, 0, lw4, lh4);

        // Stars
        ctx.fillStyle = '#ffffff';
        stars.forEach(s => {
            ctx.globalAlpha = s.size / 2.5;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 2. Draw vertical guide lines
        ctx.strokeStyle = 'rgba(224, 64, 251, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < lw4; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, lh4);
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(224, 64, 251, 0.1)';
        ctx.beginPath();
        ctx.moveTo(0, player.y + 10);
        ctx.lineTo(lw4, player.y + 10);
        ctx.stroke();

        // 3. Draw player UFO (🛸)
        ctx.save();
        ctx.translate(player.x, player.y);
        
        // Draw UFO glass dome
        ctx.fillStyle = '#64b5f6';
        ctx.beginPath();
        ctx.arc(0, -4, 8, Math.PI, 0);
        ctx.fill();

        // Draw UFO metal glowing disc body
        const discGlow = ctx.createLinearGradient(-16, 0, 16, 0);
        discGlow.addColorStop(0, '#ff4081');
        discGlow.addColorStop(0.5, '#e040fb');
        discGlow.addColorStop(1, '#ff4081');
        
        ctx.fillStyle = discGlow;
        ctx.beginPath();
        ctx.ellipse(0, 2, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw green reactor thruster dot underneath
        ctx.fillStyle = '#00e676';
        ctx.beginPath();
        ctx.arc(0, 6, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 4. Draw Obstacles (Asteroids or Gold Anomalies)
        asteroids.forEach(ast => {
            if (ast.isGold) {
                // Shiny golden anomaly star
                ctx.save();
                ctx.translate(ast.x, ast.y);
                ctx.rotate(ast.pulse);
                
                // Draw energy star glow aura
                const starGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, ast.radius + 6);
                starGlow.addColorStop(0, 'rgba(255, 214, 0, 1)');
                starGlow.addColorStop(0.5, 'rgba(255, 109, 58, 0.4)');
                starGlow.addColorStop(1, 'rgba(255, 214, 0, 0)');
                ctx.fillStyle = starGlow;
                ctx.beginPath();
                ctx.arc(0, 0, ast.radius + 6, 0, Math.PI * 2);
                ctx.fill();

                // Draw central star body
                ctx.fillStyle = '#ffd600';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * ast.radius,
                               Math.sin((18 + i * 72) * Math.PI / 180) * ast.radius);
                    ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (ast.radius/2),
                               Math.sin((54 + i * 72) * Math.PI / 180) * (ast.radius/2));
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                // Drawing planetary asteroid (Red warning rocks)
                ctx.save();
                ctx.translate(ast.x, ast.y);
                
                // Outer glow shadow
                const rockGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, ast.radius + 5);
                rockGlow.addColorStop(0, 'rgba(255, 64, 129, 0.4)');
                rockGlow.addColorStop(1, 'rgba(255, 64, 129, 0)');
                ctx.fillStyle = rockGlow;
                ctx.beginPath();
                ctx.arc(0, 0, ast.radius + 5, 0, Math.PI * 2);
                ctx.fill();

                // Solid rocky core
                ctx.fillStyle = '#ec4899';
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, ast.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Inner crater details
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.beginPath();
                ctx.arc(-ast.radius/3, -ast.radius/4, ast.radius/3, 0, Math.PI * 2);
                ctx.arc(ast.radius/4, ast.radius/3, ast.radius/4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        });

        // 5. Draw particles
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        ctx.globalAlpha = 1.0;
    }

    function gameOver() {
        gameActive = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Play epic crash explosion sound deck
        if (typeof playSynthSound === 'function') {
            playSynthSound(280, 400, 0.6, 'sawtooth');
            setTimeout(() => playSynthSound(150, 600, 0.8, 'sawtooth'), 250);
        }

        // Particles explosion at player position
        createParticleBurst(player.x, player.y, '#e040fb', 20);
        createParticleBurst(player.x, player.y, '#ff4081', 15);
        draw();

        // Update High Score if needed
        if (score > highScore) {
            highScore = score;
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('cosmic_dodger_high', highScore.toString());
            }
            if (typeof raiseToast === 'function') {
                raiseToast("NEW HIGH SCORE DETECTED!", "🏆");
            }
        }

        // Show game over screen panel
        const overlay = document.getElementById('dodger-overlay');
        const overlayIcon = document.getElementById('dodger-overlay-icon');
        const overlayTitle = document.getElementById('dodger-overlay-title');
        const overlayText = document.getElementById('dodger-overlay-text');

        if (overlay) overlay.style.display = 'flex';
        if (overlayIcon) overlayIcon.innerText = "💥🛸";
        if (overlayTitle) overlayTitle.textContent = "COSMIC COLLISION";
        if (overlayText) {
            overlayText.innerHTML = `
                <div style="font-size:1.1rem; color:var(--red); font-weight:bold; margin-bottom:10px;">TACTICAL ERROR DETECTED</div>
                <div>Your Score: <span style="color:var(--green); font-weight:bold;">${score}</span></div>
                <div>High Score: <span style="color:var(--yellow); font-weight:bold;">${highScore}</span></div>
            `;
        }
    }
})();
