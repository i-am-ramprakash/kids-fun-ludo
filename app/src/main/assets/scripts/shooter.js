// ============================================================
// STARSHIP LASER SHOOTER — Space Ludo Mini-Game
// Fully self-contained canvas game module
// ============================================================

(function () {
    'use strict';

    // ── State ────────────────────────────────────────────────
    let canvas, ctx;
    let rafId = null;
    let gameActive = false;
    let frameCount = 0;
    let logicalWidth = 0;
    let logicalHeight = 0;

    // Scoring & progression
    let score = 0;
    let highScore = parseInt(localStorage.getItem('cosmic_shooter_high') || '0', 10);
    let waveNumber = 0;
    let waveCleared = false;
    let wavePauseTimer = 0;          // frames of inter-wave pause
    let waveAnnounceAlpha = 0;       // fade for wave banner
    let bossActive = false;

    // Player
    const PLAYER = {
        w: 42, h: 26,
        speed: 9,
        targetX: 0,
        x: 0, y: 0,
        lives: 3,
        invincibleFrames: 0,         // brief i-frames after hit
        thrustFlicker: 0
    };

    // Laser
    let laserActive = false;
    let laserHitY = 0;
    let laserHitX = 0;
    let laserPulse = 0;

    // Game objects
    let enemies = [];
    let enemyBullets = [];
    let particles = [];
    let bgStars = [];

    // ── Constants ────────────────────────────────────────────
    const ENEMY_TYPES = {
        easy: {
            color: '#22c55e', glow: 'rgba(34,197,94,0.55)',
            hp: 1, pts: 50, speed: 0.7, size: 18, label: 'E',
            move(e) { e.y += e.speed; },
            draw(ctx, e) { drawJellyfish(ctx, e); }
        },
        medium: {
            color: '#3b82f6', glow: 'rgba(59,130,246,0.55)',
            hp: 3, pts: 150, speed: 0.9, size: 20, label: 'M',
            move(e) { e.y += e.speed; e.x += Math.sin(e.phase) * 1.2; e.phase += 0.05; },
            draw(ctx, e) { drawOrbAlien(ctx, e); }
        },
        hard: {
            color: '#ef4444', glow: 'rgba(239,68,68,0.55)',
            hp: 5, pts: 300, speed: 1.1, size: 22, label: 'H',
            move(e) { e.y += e.speed; e.x += Math.sin(e.phase) * 2.8; e.phase += 0.08; },
            draw(ctx, e) { drawSpiderAlien(ctx, e); }
        },
        boss: {
            color: '#a855f7', glow: 'rgba(168,85,247,0.65)',
            hp: 25, pts: 2000, speed: 0.55, size: 48, label: 'BOSS',
            move(e) { e.y += e.speed * 0.5; e.x += Math.sin(e.phase * 0.6) * 1.8; e.phase += 0.025; },
            draw(ctx, e) { drawBossShip(ctx, e); }
        }
    };

    // Wave definition: arrays of [type, count, xSpread]
    function buildWave(wNum) {
        const isBoss = (wNum % 5 === 0) && wNum > 0;
        if (isBoss) {
            bossActive = true;
            return [{ type: 'boss', count: 1, row: 0 }];
        }
        bossActive = false;
        const templates = [
            [{ type: 'easy',   count: 6, row: 0 }],
            [{ type: 'easy',   count: 5, row: 0 }, { type: 'medium', count: 3, row: 1 }],
            [{ type: 'medium', count: 5, row: 0 }, { type: 'easy',   count: 4, row: 1 }],
            [{ type: 'hard',   count: 4, row: 0 }, { type: 'medium', count: 3, row: 1 }],
            [{ type: 'hard',   count: 4, row: 0 }, { type: 'medium', count: 4, row: 1 }, { type: 'easy', count: 3, row: 2 }],
        ];
        return templates[Math.min(wNum - 1, templates.length - 1)];
    }

    function spawnWave() {
        enemies = [];
        waveNumber++;
        const layout = buildWave(waveNumber);
        const speedBoost = 1 + (waveNumber - 1) * 0.07;

        layout.forEach(group => {
            const def = ENEMY_TYPES[group.type];
            const count = group.count;
            const isBoss = group.type === 'boss';
            const startX = isBoss ? logicalWidth / 2 : 40;
            const gap = isBoss ? 0 : (logicalWidth - 80) / Math.max(count - 1, 1);
            const rowY = -60 - group.row * 55;

            for (let i = 0; i < count; i++) {
                enemies.push({
                    type: group.type,
                    x: startX + (isBoss ? 0 : i * gap),
                    y: rowY,
                    hp: def.hp,
                    maxHp: def.hp,
                    speed: def.speed * speedBoost,
                    phase: Math.random() * Math.PI * 2,
                    shootCooldown: isBoss ? 80 + Math.random() * 60 : 0,
                    hitFlash: 0,
                    size: def.size
                });
            }
        });

        waveAnnounceAlpha = 1.5; // will fade down
    }

    // ── Drawers for each alien type ──────────────────────────
    function drawJellyfish(ctx, e) {
        const def = ENEMY_TYPES.easy;
        const r = e.size;
        const fl = e.hitFlash > 0 ? 1 : 0;
        ctx.save();
        ctx.translate(e.x, e.y);
        // glow
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r + 6);
        g.addColorStop(0, fl ? '#fff' : def.glow);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2); ctx.fill();
        // body dome
        ctx.fillStyle = fl ? '#fff' : def.color;
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.closePath(); ctx.fill();
        // bell bottom
        ctx.fillStyle = fl ? '#fff' : '#16a34a';
        ctx.beginPath(); ctx.ellipse(0, 2, r, 5, 0, 0, Math.PI); ctx.fill();
        // tentacles
        for (let i = -2; i <= 2; i++) {
            ctx.strokeStyle = fl ? '#fff' : 'rgba(34,197,94,0.6)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(i * (r / 2.5), 4);
            ctx.quadraticCurveTo(i * (r / 2.5) + Math.sin(frameCount * 0.08 + i) * 4, 14, i * (r / 2.5), 20);
            ctx.stroke();
        }
        // eye
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, -4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#052e16'; ctx.beginPath(); ctx.arc(-4, -4, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawOrbAlien(ctx, e) {
        const def = ENEMY_TYPES.medium;
        const r = e.size;
        const fl = e.hitFlash > 0;
        const pulse = Math.sin(frameCount * 0.12) * 3;
        ctx.save();
        ctx.translate(e.x, e.y);
        // outer pulse ring
        ctx.strokeStyle = fl ? '#fff' : def.glow;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 + Math.sin(frameCount * 0.1) * 0.2;
        ctx.beginPath(); ctx.arc(0, 0, r + pulse + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
        // core orb
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        g.addColorStop(0, fl ? '#fff' : '#93c5fd');
        g.addColorStop(0.5, fl ? '#bfdbfe' : def.color);
        g.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // inner crack patterns
        if (!fl) {
            ctx.strokeStyle = 'rgba(147,197,253,0.5)'; ctx.lineWidth = 1;
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.stroke();
            }
        }
        // eye cluster
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.arc(-5, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1b4b'; ctx.beginPath(); ctx.arc(5, -3, 2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawSpiderAlien(ctx, e) {
        const def = ENEMY_TYPES.hard;
        const r = e.size;
        const fl = e.hitFlash > 0;
        ctx.save();
        ctx.translate(e.x, e.y);
        // legs
        const legAngles = [-0.6, -0.35, 0.35, 0.6, Math.PI + 0.6, Math.PI + 0.35, Math.PI - 0.35, Math.PI - 0.6];
        legAngles.forEach((a, idx) => {
            const legOsc = Math.sin(frameCount * 0.15 + idx) * 3;
            ctx.strokeStyle = fl ? '#fff' : def.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
            ctx.lineTo(Math.cos(a) * (r + 14) + legOsc, Math.sin(a) * (r + 14) + legOsc * 0.5);
            ctx.stroke();
        });
        // body
        const bg = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        bg.addColorStop(0, fl ? '#fff' : '#fca5a5');
        bg.addColorStop(0.6, fl ? '#fecaca' : def.color);
        bg.addColorStop(1, '#7f1d1d');
        ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        // abdomen dot pattern
        if (!fl) {
            ctx.fillStyle = '#7f1d1d';
            [-6, 0, 6].forEach(ox => { ctx.beginPath(); ctx.arc(ox, 4, 2.5, 0, Math.PI * 2); ctx.fill(); });
        }
        // eyes
        for (let i = -1; i <= 1; i += 2) {
            ctx.fillStyle = fl ? '#fff' : '#fef08a';
            ctx.beginPath(); ctx.arc(i * 5, -6, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(i * 5, -6, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    function drawBossShip(ctx, e) {
        const r = e.size;
        const fl = e.hitFlash > 0;
        const rot = frameCount * 0.018;
        ctx.save();
        ctx.translate(e.x, e.y);

        // outer ring orbit
        ctx.strokeStyle = fl ? '#fff' : 'rgba(168,85,247,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.arc(0, 0, r + 14, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);

        // rotating gun pods
        for (let i = 0; i < 4; i++) {
            const a = rot + (i / 4) * Math.PI * 2;
            const px = Math.cos(a) * (r + 14);
            const py = Math.sin(a) * (r + 14);
            ctx.fillStyle = fl ? '#fff' : '#d946ef';
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = fl ? '#fff' : '#7e22ce'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke();
        }

        // main hull glow
        const g = ctx.createRadialGradient(0, -r * 0.3, 2, 0, 0, r);
        g.addColorStop(0, fl ? '#fff' : '#e9d5ff');
        g.addColorStop(0.5, fl ? '#c4b5fd' : '#a855f7');
        g.addColorStop(1, '#581c87');
        ctx.fillStyle = g;
        ctx.beginPath();
        // hexagonal hull
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = fl ? '#fff' : '#c084fc'; ctx.lineWidth = 2; ctx.stroke();

        // inner core reactor
        const ig = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.45);
        ig.addColorStop(0, fl ? '#fff' : 'rgba(233,213,255,0.9)');
        ig.addColorStop(1, fl ? '#c4b5fd' : 'rgba(168,85,247,0.3)');
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2); ctx.fill();

        // multi eyes
        const eyePositions = [{ x: -14, y: -4 }, { x: 0, y: -10 }, { x: 14, y: -4 }];
        eyePositions.forEach(ep => {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ep.x, ep.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(ep.x, ep.y, 2.5, 0, Math.PI * 2); ctx.fill();
        });

        ctx.restore();

        // Health bar
        const bw = r * 2.5;
        const bh = 6;
        const bx = e.x - bw / 2;
        const by = e.y - r - 18;
        const hpFrac = e.hp / e.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath(); ctx.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 3); ctx.fill();
        const hg = ctx.createLinearGradient(bx, 0, bx + bw * hpFrac, 0);
        hg.addColorStop(0, '#a855f7'); hg.addColorStop(1, '#ec4899');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.roundRect(bx, by, bw * hpFrac, bh, 2); ctx.fill();
        ctx.strokeStyle = '#7e22ce'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 2); ctx.stroke();

        // "BOSS" label above health bar
        ctx.fillStyle = '#f0abfc';
        ctx.font = 'bold 9px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ BOSS', e.x, by - 4);
    }

    // ── Player drawing (UFO — matches dodger game) ────────────
    function drawPlayer() {
        if (PLAYER.invincibleFrames > 0 && Math.floor(PLAYER.invincibleFrames / 4) % 2 === 0) return; // blink
        const { x, y } = PLAYER;
        ctx.save();
        ctx.translate(x, y);

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
    }

    // ── Laser beam rendering ─────────────────────────────────
    function drawLaser() {
        if (!laserActive) return;
        laserPulse += 0.18;
        const wobble = Math.sin(laserPulse) * 1.5;
        const lx = PLAYER.x + wobble;
        const topY = laserHitY;
        const botY = PLAYER.y - PLAYER.h / 2;

        // outer glow
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.sin(laserPulse * 1.4) * 0.1;
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 10;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(lx, botY);
        ctx.lineTo(laserHitX, topY);
        ctx.stroke();

        // mid glow
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(lx, botY);
        ctx.lineTo(laserHitX, topY);
        ctx.stroke();

        // core beam
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(lx, botY);
        ctx.lineTo(laserHitX, topY);
        ctx.stroke();

        ctx.restore();
    }

    // ── Particle system ──────────────────────────────────────
    function burst(x, y, color, count, speed = 3) {
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = Math.random() * speed + 1;
            particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, size: Math.random() * 4 + 1, color });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx; p.y += p.vy;
            p.vy += 0.04; // mild gravity
            p.life -= 0.035;
            if (p.life <= 0) particles.splice(i, 1);
        }
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    // ── HUD ─────────────────────────────────────────────────
    function drawHUD() {
        ctx.save();
        // dark bar
        ctx.fillStyle = 'rgba(2,0,16,0.75)';
        ctx.fillRect(0, 0, logicalWidth, 36);

        ctx.font = 'bold 13px Nunito, sans-serif';
        ctx.textBaseline = 'middle';

        // Score
        ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'left';
        ctx.fillText('SCORE', 10, 12);
        ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 16px Nunito, sans-serif';
        ctx.fillText(score.toLocaleString(), 10, 26);

        // Wave
        ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center'; ctx.font = 'bold 13px Nunito, sans-serif';
        ctx.fillText(bossActive ? '⚠ BOSS WAVE' : `WAVE ${waveNumber}`, logicalWidth / 2, 12);
        ctx.fillStyle = bossActive ? '#f0abfc' : '#a5f3fc'; ctx.font = 'bold 11px Nunito, sans-serif';
        ctx.fillText(`${enemies.length} remaining`, logicalWidth / 2, 26);

        // Lives (hearts)
        ctx.textAlign = 'right';
        ctx.font = '18px sans-serif';
        for (let i = 0; i < PLAYER.lives; i++) {
            ctx.fillText('❤', logicalWidth - 10 - i * 22, 20);
        }

        ctx.restore();
    }

    // ── Wave announcement ────────────────────────────────────
    function drawWaveAnnounce() {
        if (waveAnnounceAlpha <= 0) return;
        const alpha = Math.min(1, waveAnnounceAlpha);
        ctx.save();
        ctx.globalAlpha = alpha;
        const msg = bossActive ? '⚠  BOSS INCOMING!' : `WAVE ${waveNumber}`;
        const sub = bossActive ? 'Defeat the mothership!' : 'Prepare for battle!';
        ctx.font = 'bold 28px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = bossActive ? '#f0abfc' : '#00e5ff';
        ctx.shadowColor = bossActive ? '#a855f7' : '#00e5ff';
        ctx.shadowBlur = 20;
        ctx.fillText(msg, logicalWidth / 2, logicalHeight / 2 - 14);
        ctx.font = 'bold 13px Nunito, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowBlur = 8;
        ctx.fillText(sub, logicalWidth / 2, logicalHeight / 2 + 16);
        ctx.restore();
        waveAnnounceAlpha -= 0.018;
    }

    // ── Background stars ─────────────────────────────────────
    function initBgStars() {
        bgStars = [];
        const n = Math.floor((logicalWidth * logicalHeight) / 3500);
        for (let i = 0; i < n; i++) {
            bgStars.push({
                x: Math.random() * logicalWidth,
                y: Math.random() * logicalHeight,
                size: Math.random() * 1.8 + 0.3,
                speed: Math.random() * 1.2 + 0.3,
                alpha: Math.random() * 0.6 + 0.2
            });
        }
    }

    function updateBgStars() {
        bgStars.forEach(s => {
            s.y += s.speed;
            if (s.y > logicalHeight) { s.y = 0; s.x = Math.random() * logicalWidth; }
        });
    }

    function drawBg() {
        ctx.fillStyle = '#020010';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);
        // nebula soft cloud
        const nb = ctx.createRadialGradient(logicalWidth * 0.7, logicalHeight * 0.25, 10, logicalWidth * 0.7, logicalHeight * 0.25, logicalWidth * 0.55);
        nb.addColorStop(0, 'rgba(88,28,135,0.08)');
        nb.addColorStop(1, 'transparent');
        ctx.fillStyle = nb; ctx.fillRect(0, 0, logicalWidth, logicalHeight);

        bgStars.forEach(s => {
            ctx.save();
            ctx.globalAlpha = s.alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    // ── Enemy bullets ────────────────────────────────────────
    function spawnEnemyBullet(e) {
        enemyBullets.push({
            x: e.x, y: e.y + e.size,
            vx: (PLAYER.x - e.x) / 60,
            vy: 4 + waveNumber * 0.1,
            life: 1
        });
    }

    function updateEnemyBullets() {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            b.x += b.vx; b.y += b.vy;
            if (b.y > logicalHeight + 20) { enemyBullets.splice(i, 1); continue; }

            // Hit player
            if (PLAYER.invincibleFrames <= 0) {
                const dx = b.x - PLAYER.x;
                const dy = b.y - PLAYER.y;
                if (Math.hypot(dx, dy) < PLAYER.w / 2 - 4) {
                    enemyBullets.splice(i, 1);
                    hitPlayer();
                    continue;
                }
            }
        }
    }

    function drawEnemyBullets() {
        enemyBullets.forEach(b => {
            ctx.save();
            ctx.fillStyle = '#f0abfc';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    // ── Collision & game logic ───────────────────────────────
    function resolveCollisions() {
        laserActive = false;
        if (enemies.length === 0) return;

        const lx = PLAYER.x;
        const ly = PLAYER.y - PLAYER.h / 2;

        // Find topmost enemy intersected by laser x
        let closestEnemy = null;
        let closestDist = Infinity;

        enemies.forEach(e => {
            const def = ENEMY_TYPES[e.type];
            const dx = Math.abs(e.x - lx);
            if (dx < e.size + 4 && e.y < ly) {
                const dist = ly - e.y;
                if (dist < closestDist) { closestDist = dist; closestEnemy = e; }
            }
        });

        if (closestEnemy) {
            laserActive = true;
            laserHitY = closestEnemy.y;
            laserHitX = closestEnemy.x;

            // Apply continuous laser DPS (1 damage per ~6 frames)
            if (frameCount % 6 === 0) {
                closestEnemy.hp--;
                closestEnemy.hitFlash = 6;
                burst(closestEnemy.x, closestEnemy.y, ENEMY_TYPES[closestEnemy.type].color, 3, 2);

                if (closestEnemy.hp <= 0) {
                    const def = ENEMY_TYPES[closestEnemy.type];
                    score += def.pts;
                    burst(closestEnemy.x, closestEnemy.y, def.color, 18, 4);
                    burst(closestEnemy.x, closestEnemy.y, '#ffffff', 8, 3);
                    if (typeof playSynthSound === 'function') {
                        playSynthSound(closestEnemy.type === 'boss' ? 200 : 660, 120, 0.3, 'sawtooth');
                    }
                    enemies.splice(enemies.indexOf(closestEnemy), 1);
                    updateShooterUI();
                }
            }
        } else {
            // Laser reaches top of screen
            laserActive = true;
            laserHitY = 36;
            laserHitX = lx;
        }
    }

    function hitPlayer() {
        PLAYER.lives--;
        PLAYER.invincibleFrames = 90;
        burst(PLAYER.x, PLAYER.y, '#f87171', 14, 4);
        burst(PLAYER.x, PLAYER.y, '#fff', 6, 3);
        if (typeof playSynthSound === 'function') {
            playSynthSound(200, 400, 0.6, 'sawtooth');
        }
        if (PLAYER.lives <= 0) {
            endGame();
        }
    }

    function checkEnemyReachPlayer() {
        enemies.forEach(e => {
            if (e.y > logicalHeight - 60) {
                if (PLAYER.invincibleFrames <= 0) {
                    enemies.splice(enemies.indexOf(e), 1);
                    hitPlayer();
                }
            }
        });
    }

    function updateShooterUI() {
        const el = document.getElementById('shooter-score');
        if (el) el.textContent = score.toLocaleString();
    }

    // ── Main game loop ───────────────────────────────────────
    function gameLoop() {
        if (!gameActive) return;
        frameCount++;

        // Smooth player movement
        PLAYER.x += (PLAYER.targetX - PLAYER.x) * 0.2;
        PLAYER.x = Math.max(PLAYER.w / 2, Math.min(logicalWidth - PLAYER.w / 2, PLAYER.x));
        if (PLAYER.invincibleFrames > 0) PLAYER.invincibleFrames--;

        // Update background
        updateBgStars();

        // Update enemies
        enemies.forEach(e => {
            ENEMY_TYPES[e.type].move(e);
            if (e.hitFlash > 0) e.hitFlash--;
            // Boss shoots
            if (e.type === 'boss') {
                e.shootCooldown--;
                if (e.shootCooldown <= 0) {
                    spawnEnemyBullet(e);
                    e.shootCooldown = 55 + Math.random() * 40;
                }
            }
        });

        // Hard enemies occasionally shoot too (higher waves)
        if (waveNumber >= 4 && frameCount % 120 === 0) {
            const hardEnemies = enemies.filter(e => e.type === 'hard');
            if (hardEnemies.length > 0) {
                spawnEnemyBullet(hardEnemies[Math.floor(Math.random() * hardEnemies.length)]);
            }
        }

        updateEnemyBullets();
        updateParticles();

        // Laser + collision
        resolveCollisions();

        // Enemy reaches bottom check
        checkEnemyReachPlayer();

        // Wave cleared?
        if (enemies.length === 0 && !waveCleared && wavePauseTimer === 0) {
            waveCleared = true;
            wavePauseTimer = 90;
            if (typeof playSynthSound === 'function') {
                playSynthSound(523, 80, 0.3, 'sine');
                setTimeout(() => playSynthSound(659, 80, 0.3, 'sine'), 100);
                setTimeout(() => playSynthSound(784, 200, 0.4, 'sine'), 200);
            }
        }
        if (wavePauseTimer > 0) {
            wavePauseTimer--;
            if (wavePauseTimer === 0 && waveCleared) {
                waveCleared = false;
                spawnWave();
            }
        }

        // ── Draw ────────────────────────────────────────────
        drawBg();
        drawLaser();
        drawEnemyBullets();
        enemies.forEach(e => ENEMY_TYPES[e.type].draw(ctx, e));
        drawPlayer();
        drawParticles();
        drawHUD();
        drawWaveAnnounce();

        rafId = requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameActive = false;
        removeShooterListeners();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

        burst(PLAYER.x, PLAYER.y, '#f87171', 25, 5);
        burst(PLAYER.x, PLAYER.y, '#fbbf24', 15, 4);
        drawBg();
        drawParticles();

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('cosmic_shooter_high', highScore.toString());
            if (typeof raiseToast === 'function') raiseToast('NEW HIGH SCORE! 🏆', '🌟');
        }

        showShooterOverlay('SHIP DESTROYED', score, highScore, true);
        updateShooterCardBest();
    }

    // ── Overlay helpers ──────────────────────────────────────
    function showShooterOverlay(title, sc, hi, isGameOver) {
        const ov = document.getElementById('shooter-overlay');
        const ot = document.getElementById('shooter-overlay-title');
        const ob = document.getElementById('shooter-overlay-body');
        const octa = document.getElementById('shooter-overlay-cta');
        if (!ov) return;
        ov.style.display = 'flex';
        if (ot) ot.textContent = title;
        if (ob) ob.innerHTML = isGameOver
            ? `<div style="font-size:1rem;color:#f87171;font-weight:bold;margin-bottom:8px;">TACTICAL RETREAT</div>
               <div>Final Score: <span style="color:#00e5ff;font-weight:bold">${sc.toLocaleString()}</span></div>
               <div>Best Score: <span style="color:#fbbf24;font-weight:bold">${hi.toLocaleString()}</span></div>
               <div style="margin-top:6px;font-size:0.7rem;color:#94a3b8">Waves survived: ${waveNumber}</div>`
            : `<div style="color:#a5f3fc;font-size:0.85rem;">Slide your finger left/right to move.<br>Your laser fires automatically!</div>`;
        if (octa) octa.textContent = isGameOver ? 'REDEPLOY SHIP' : 'ENGAGE THRUSTERS';
    }

    function updateShooterCardBest() {
        const el = document.getElementById('shooter-card-best');
        if (el) el.textContent = highScore.toLocaleString();
    }

    function addShooterListeners() {
        window.addEventListener('touchmove', handleShooterInput, { passive: false });
        window.addEventListener('touchstart', handleShooterInput, { passive: false });
        window.addEventListener('mousemove', handleShooterInput);
        window.addEventListener('pointermove', handleShooterInput);
        window.addEventListener('pointerdown', handleShooterInput);
    }

    function removeShooterListeners() {
        window.removeEventListener('touchmove', handleShooterInput);
        window.removeEventListener('touchstart', handleShooterInput);
        window.removeEventListener('mousemove', handleShooterInput);
        window.removeEventListener('pointermove', handleShooterInput);
        window.removeEventListener('pointerdown', handleShooterInput);
    }

    // ── Input handling ───────────────────────────────────────
    function handleShooterInput(e) {
        if (!gameActive) return;
        
        let clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            if (e.cancelable) e.preventDefault();
        } else if (e.clientX !== undefined) {
            clientX = e.clientX;
        } else {
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const relX = ((clientX - rect.left) / rect.width) * logicalWidth;
        PLAYER.targetX = Math.max(PLAYER.w / 2, Math.min(logicalWidth - PLAYER.w / 2, relX));
    }

    // ── Canvas resize ────────────────────────────────────────
    function resizeCanvas() {
        if (!canvas) return;
        const container = canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;
        logicalWidth = w;
        logicalHeight = h;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);
        // Update player position reference
        PLAYER.x = w / 2;
        PLAYER.targetX = w / 2;
        PLAYER.y = h - 120;
        initBgStars();
    }

    // ── Public API ───────────────────────────────────────────
    window.openStarshipShooter = function () {
        if (typeof navigateTo === 'function') navigateTo('starship-shooter-view');
        const hudToggle = document.getElementById('global-hud-toggle');
        if (hudToggle) hudToggle.style.display = 'none';
        setTimeout(() => initShooterGame(), 80);
    };

    window.addEventListener('resize', () => {
        if (gameActive) resizeCanvas();
    });

    function initShooterGame() {
        canvas = document.getElementById('shooter-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resizeCanvas();

        // Reset state
        score = 0; waveNumber = 0; waveCleared = false; wavePauseTimer = 0;
        waveAnnounceAlpha = 0; enemies = []; enemyBullets = []; particles = [];
        laserActive = false; bossActive = false;
        PLAYER.lives = 3; PLAYER.invincibleFrames = 0;
        frameCount = 0;

        updateShooterUI();
        updateShooterCardBest();
        showShooterOverlay('STARSHIP ASSAULT', 0, highScore, false);

        // Clean up any lingering listeners
        removeShooterListeners();

        // Draw initial frame
        drawBg();
    }

    window.startShooterGame = function () {
        if (gameActive) return;
        gameActive = true;
        const ov = document.getElementById('shooter-overlay');
        if (ov) ov.style.display = 'none';
        spawnWave();

        addShooterListeners();

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(gameLoop);
        if (typeof playSynthSound === 'function') {
            playSynthSound(440, 80, 0.3, 'sine');
            setTimeout(() => playSynthSound(660, 120, 0.35, 'sine'), 100);
        }
    };

    window.stopShooterGame = function () {
        gameActive = false;
        removeShooterListeners();
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        const hudToggle = document.getElementById('global-hud-toggle');
        if (hudToggle) hudToggle.style.display = '';
    };

})();
