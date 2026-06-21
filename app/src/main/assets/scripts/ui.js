function setButtonText(id, full, short) {
    const btn = document.getElementById(id);
    if (btn) {
        btn.innerHTML = `<span class="btn-full-text">${full}</span><span class="btn-short-text">${short}</span>`;
    }
}

function spawnConfetti() {
    if (typeof document === 'undefined') return;
    const colors = ['#FF4757', '#2ED573', '#FFC312', '#1E90FF', '#FF6B9D', '#FFA502', '#00D2D3'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
    document.body.appendChild(container);

    for (let i = 0; i < 80; i++) {
        const el = document.createElement('div');
        const size = Math.random() * 10 + 6;
        const startX = Math.random() * 100;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const delay = Math.random() * 0.6;
        const duration = Math.random() * 1.4 + 1.4;
        el.style.cssText = `
            position: absolute;
            left: ${startX}%;
            top: -20px;
            width: ${size}px;
            height: ${size * (Math.random() > 0.5 ? 1 : 0.6)}px;
            background: ${color};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            opacity: 0.95;
            transform: rotate(${Math.random() * 360}deg);
            transition: transform ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s, opacity ${duration}s ease ${delay}s;
        `;
        container.appendChild(el);
        requestAnimationFrame(() => {
            el.style.transform = `translateY(110vh) rotate(${Math.random() * 720 - 360}deg)`;
            el.style.opacity = '0';
        });
    }
    setTimeout(() => container.remove(), 3200);
}

const __playerRgbCache = {};
// Dynamic RGB helper to fetch values from CSS custom properties safely under caching
function getPlayerRGB(colorVarName) {
    if (__playerRgbCache[colorVarName]) {
        return __playerRgbCache[colorVarName];
    }
    const hex = getComputedStyle(document.documentElement).getPropertyValue(`--${colorVarName}`).trim();
    if (hex.startsWith('#')) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const result = `${r},${g},${b}`;
        __playerRgbCache[colorVarName] = result;
        return result;
    }
    const fallback = {
        green: '0,255,102',
        yellow: '255,204,0',
        red: '255,51,102',
        blue: '51,153,255'
    };
    const result = fallback[colorVarName] || '255,255,255';
    __playerRgbCache[colorVarName] = result;
    return result;
}

// Active Turn visual sync
function updateTurnUIVisually() {
    // Auto-save the flight state immediately on any major sync update
    if (typeof saveGameStateToLocalStorage === 'function') {
        saveGameStateToLocalStorage();
    }

    // Intercept settings gear and update mini scoreboard HUD
    hookSettingsGear();
    updateMiniScoreboard();

    // Update indicator header
    const activeP = players[state.activePlayer];
    const indicator = document.getElementById('turn-indicator');
    if (indicator) {
        const roleTag = isBot(state.activePlayer) ? ' 🤖' : '';
        indicator.innerText = `${activeP.name}${roleTag} TURN`;
        const rgb = getPlayerRGB(activeP.color);
        indicator.style.backgroundColor = `rgba(${rgb}, 0.25)`;
        indicator.style.boxShadow = `0 0 10px rgba(${rgb}, 0.45)`;
        indicator.style.color = `var(--${activeP.color})`;
    }

    // Toggle panels active status colors
    for (let i = 0; i < 4; i++) {
        const panel = document.getElementById(`panel-${i}`);
        
        // Synchronize global scoreboard card data
        const completions = state.pawnPositions[i].filter(v => v === getFinishPos()).length;
        const valElem = document.getElementById(`score-val-${i}`);
        if (valElem) valElem.innerText = `★ ${completions}/${state.pawnPositions[i].length}`;
        
        const scoreCard = document.getElementById(`score-card-${i}`);

        if (panel) {
            const diceContainer = document.getElementById(`player-dice-container-${i}`);
            if (i === state.activePlayer) {
                if (scoreCard) scoreCard.classList.add('active');
                panel.classList.add('active');
                
                if (diceContainer) {
                    if (!state.hasRolled && !state.isAnimating) {
                        diceContainer.classList.add('active-roll-glowing');
                    } else {
                        diceContainer.classList.remove('active-roll-glowing');
                    }
                }
            } else {
                if (scoreCard) scoreCard.classList.remove('active');
                panel.classList.remove('active');
                if (diceContainer) {
                    diceContainer.classList.remove('active-roll-glowing');
                }
            }
        }

        const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
        const isQuick = (state && state.gameConfig && state.gameConfig.mode === 'quick');
        const hidePowers = isMini || isQuick;
        const actionsRow = panel ? panel.querySelector('.panel-actions-row') : null;
        if (actionsRow) {
            actionsRow.style.display = hidePowers ? 'none' : '';
        }

        // Warp power sync
        const warpBtn = document.getElementById(`warp-${i}`);
        if (warpBtn && !isMini) {
            if (state.warpUnlocked[i] && !state.warpUsed[i] && i === state.activePlayer && !state.isAnimating && state.hasRolled) {
                warpBtn.classList.add('unlocked');
                warpBtn.disabled = false;
                setButtonText(`warp-${i}`, 'ZOOM!', '⚡');
            } else {
                warpBtn.classList.remove('unlocked');
                warpBtn.disabled = true;
                if (state.warpUsed[i]) {
                    setButtonText(`warp-${i}`, "DONE!", "⚡❌");
                } else {
                    setButtonText(`warp-${i}`, "ZOOM!", "⚡");
                }
            }
        }

        // Combined Single Alien deploy synchronization
        const alienCombinedBtn = document.getElementById(`alien-${i}-combined`);
        if (alienCombinedBtn && !isMini) {
            const unusedCount = (!state.aliensUsed[i][0] ? 1 : 0) + (!state.aliensUsed[i][1] ? 1 : 0);
            
            if (unusedCount === 0) {
                setButtonText(`alien-${i}-combined`, "👾 USED", "👾❌");
                alienCombinedBtn.style.opacity = "0.5";
                alienCombinedBtn.disabled = true;
            } else if (!state.canDeployAliens[i]) {
                setButtonText(`alien-${i}-combined`, "🔒 👾 LOCKED", "🔒 👾");
                alienCombinedBtn.style.opacity = "0.4";
                alienCombinedBtn.disabled = true;
                alienCombinedBtn.title = "Unlocks when your pawn is captured by opponent";
            } else {
                const isThisPlayerSelecting = (i === state.activePlayer && state.activeAlienSelect !== -1);
                const btnText = isThisPlayerSelecting ? "❌ CANCEL" : `👾 LAUNCH (${unusedCount})`;
                const btnShort = isThisPlayerSelecting ? "❌" : `👾 (${unusedCount})`;
                setButtonText(`alien-${i}-combined`, btnText, btnShort);
                if (i === state.activePlayer && !state.isAnimating) {
                    alienCombinedBtn.style.opacity = "1";
                    alienCombinedBtn.disabled = false;
                } else {
                    alienCombinedBtn.style.opacity = "0.5";
                    alienCombinedBtn.disabled = true;
                }
            }
        }
    }

    // Render the dynamic power-up inventory system
    if (typeof gamePowerUpEngine !== 'undefined') {
        gamePowerUpEngine.renderInventory();
    }

    applyPlayerSlotVisibility();
    updatePlayerTypeBadges();
    if (isBot(state.activePlayer)) {
        scheduleBotTurn(700);
    }
}

// Populate dynamic pawns inside targets with GPU acceleration & hardware FLIP transitions
function renderPawns() {
    // 1. Capture physical coordinates before DOM mutation for high-FPS FLIP layout transition
    const firstRects = {};
    document.querySelectorAll('.pawn').forEach(pawn => {
        firstRects[pawn.id] = pawn.getBoundingClientRect();
    });

    // Remove previous pawn DOMs and badges from bases, tracks, and finish sectors
    document.querySelectorAll('.pawn').forEach(e => e.remove());
    document.querySelectorAll('.finished-pawn-circle').forEach(e => e.remove());
    document.querySelectorAll('.finish-count-badge').forEach(e => e.remove());
    document.querySelectorAll('.finish-tri-num').forEach(e => e.remove());

    // A map storing lists of pawns placed in each cell coord key
    const placements = {};

    // Build green, yellow, red, blue player pawns
    for (let playerIdx = 0; playerIdx < 4; playerIdx++) {
        const p = players[playerIdx];
        const activePawnsForColor = state.pawnPositions[playerIdx];
        const sector = document.getElementById(`finish-sector-${playerIdx}`);

        // Count finished pawns first, then render a single badge instead of overlapping circles
        let finCount = 0;

        for (let pawnIdx = 0; pawnIdx < activePawnsForColor.length; pawnIdx++) {
            const pos = activePawnsForColor[pawnIdx];
            if (pos === getFinishPos()) {
                finCount++;
                continue; // Don't place individual pawns — we'll show a badge instead
            }

            const pawnDOM = document.createElement('div');
            pawnDOM.className = `pawn ${p.color}-p`;
            if (state.shieldedPawns && state.shieldedPawns[playerIdx][pawnIdx]) {
                pawnDOM.classList.add('shielded-pawn');
            }
            if (state.burningPawns && state.burningPawns[playerIdx][pawnIdx] > 0) {
                pawnDOM.classList.add('burning-pawn');
            }
            pawnDOM.id = `pawn-${playerIdx}-${pawnIdx}`;
            pawnDOM.setAttribute('data-player', playerIdx);
            pawnDOM.setAttribute('data-pawn', pawnIdx);
            let skinId = 'classic';
            if (state.isMultiplayer && window.Multiplayer && window.onlinePlayersMap) {
                const uid = window.onlinePlayersMap[playerIdx];
                if (uid === window.Multiplayer.userId) {
                    skinId = (typeof commanderProfile !== 'undefined' && commanderProfile.equippedSkin) ? commanderProfile.equippedSkin : 'classic';
                } else if (uid) {
                    const profile = window.onlinePlayersProfiles && window.onlinePlayersProfiles[uid];
                    skinId = (profile && profile.equippedSkin) || 'classic';
                }
            } else {
                if (typeof isBot === 'function' && !isBot(playerIdx)) {
                    skinId = (typeof commanderProfile !== 'undefined' && commanderProfile.equippedSkin) ? commanderProfile.equippedSkin : 'classic';
                } else {
                    const botSkins = ['classic', 'cruiser', 'vortex', 'quantum'];
                    skinId = botSkins[playerIdx % botSkins.length];
                }
            }
            pawnDOM.innerHTML = `<img src="images/generated/pawns/skin_pawn_${skinId}.png" style="width: 80%; height: 80%; object-fit: contain; pointer-events: none; z-index: 2;" /><div class="engine-flame"></div>`;

            // Determine targeting container
            if (pos === -1) {
                // Sits in Base slot
                const baseSlot = document.getElementById(`base-slot-${playerIdx}-${pawnIdx}`);
                if (baseSlot) baseSlot.appendChild(pawnDOM);
            } else {
                // Sits on real coord map track
                const coord = pathMaps[playerIdx][pos];
                if (coord) {
                    const key = `cell-${coord[0]}-${coord[1]}`;
                    if (!placements[key]) {
                        placements[key] = [];
                    }
                    placements[key].push(pawnDOM);
                } else {
                    console.error(`Pawn position out of bounds: player ${playerIdx}, pawn ${pawnIdx}, pos ${pos}`);
                }
            }
        }

        // Render a centered number directly inside the triangle — no box, no border
        if (finCount > 0) {
            const finishZone = document.getElementById('center-finish-zone');
            if (finishZone) {
                // Remove any existing badge for this player
                const existingBadge = finishZone.querySelector(`.finish-tri-num-${playerIdx}`);
                if (existingBadge) existingBadge.remove();

                const numEl = document.createElement('div');
                numEl.className = `finish-tri-num finish-tri-num-${playerIdx}`;
                // Position centred inside each triangle and rotated to face
                // the player seated on that side of the board:
                //   green  = left  → rotate -90° (counter-clockwise, faces left)
                //   yellow = top   → rotate 180°  (faces top)
                //   red    = bottom→ rotate   0°  (default upright, faces bottom)
                //   blue   = right → rotate  90°  (clockwise, faces right)
                const positions = [
                    { left: '18%', top: '50%', rotate: '90deg'   }, // green  (left)
                    { left: '50%', top: '18%', rotate: '180deg'  }, // yellow (top)
                    { left: '50%', top: '82%', rotate: '180deg'  }, // red    (bottom)
                    { left: '82%', top: '50%', rotate:  '90deg'  }, // blue   (right)
                ];
                const colorVars = ['var(--green)', 'var(--yellow)', 'var(--red)', 'var(--blue)'];
                const pos = positions[playerIdx];
                numEl.style.cssText = `
                    position: absolute;
                    left: ${pos.left};
                    top: ${pos.top};
                    transform: translate(-50%, -50%) rotate(${pos.rotate});
                    font-family: 'Orbitron','Nunito',sans-serif;
                    font-weight: 900;
                    font-size: clamp(12px, 1.8vw, 20px);
                    color: #ffffff;
                    text-shadow: 0 0 8px ${colorVars[playerIdx]}, 1px 1px 0 rgba(0,0,0,0.9);
                    z-index: 12;
                    pointer-events: none;
                    line-height: 1;
                    user-select: none;
                `;
                numEl.textContent = finCount;
                numEl.title = `${finCount} UFO${finCount > 1 ? 's' : ''} docked`;
                finishZone.appendChild(numEl);
            }
        }

        // Sync counter finishes
        const finEl = document.getElementById(`finish-cnt-${playerIdx}`);
        if (finEl) finEl.innerText = `★ ${finCount}/${activePawnsForColor.length}`;
    }

    // Append path pawns programmatically applying layered stacking offsets
    Object.keys(placements).forEach((key) => {
        const cell = document.getElementById(key);
        if (cell) {
            const cellPawns = placements[key];
            const numPawns = cellPawns.length;

            // Sort cellPawns: active player's pawns should always go last (to render on top of others)
            cellPawns.sort((a, b) => {
                const aActive = a.id.startsWith(`pawn-${state.activePlayer}-`);
                const bActive = b.id.startsWith(`pawn-${state.activePlayer}-`);
                if (aActive && !bActive) return 1;
                if (!aActive && bActive) return -1;
                return 0;
            });

            cellPawns.forEach((pawnDOM, idx) => {
                pawnDOM.style.position = 'absolute';
                if (numPawns > 1) {
                    // Scale down stacked pawns slightly to fit beautifully inside board grid cells
                    pawnDOM.style.width = '17px';
                    pawnDOM.style.height = '17px';
                    pawnDOM.style.fontSize = '0.55rem';

                    // Visual stacking offset of 2.5px horizontal and 2.5px vertical per layer
                    const shiftX = idx * 2.5;
                    const shiftY = idx * -2.5;
                    pawnDOM.style.setProperty('--shift-x', `${shiftX}px`);
                    pawnDOM.style.setProperty('--shift-y', `${shiftY}px`);
                    pawnDOM.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
                } else {
                    // Single pawn in cell: standard 24px and centered
                    pawnDOM.style.width = '24px';
                    pawnDOM.style.height = '24px';
                    pawnDOM.style.fontSize = '0.9rem';
                    pawnDOM.style.removeProperty('--shift-x');
                    pawnDOM.style.removeProperty('--shift-y');
                    pawnDOM.style.transform = 'none';
                }
                pawnDOM.style.zIndex = 10 + idx;
                cell.appendChild(pawnDOM);
            });
        }
    });

    // 2. Compute Inverse transforms and initiate GPU-accelerated transition (FLIP methodology)
    document.querySelectorAll('.pawn').forEach(pawn => {
        const first = firstRects[pawn.id];
        if (first) {
            const last = pawn.getBoundingClientRect();
            const dx = first.left - last.left;
            const dy = first.top - last.top;

            // Only animate transitions if the position physically changed
            if (dx !== 0 || dy !== 0) {
                const shiftX = parseFloat(pawn.style.getPropertyValue('--shift-x')) || 0;
                const shiftY = parseFloat(pawn.style.getPropertyValue('--shift-y')) || 0;

                // Set initial state without transition instantly
                pawn.style.transition = 'none';
                pawn.style.transform = `translate3d(${dx + shiftX}px, ${dy + shiftY}px, 0)`;

                // Force reflow
                pawn.offsetHeight;

                // Animate to final position smoothly
                pawn.style.transition = 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)';
                pawn.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`;
            }
        }
    });

    // Sync visual glows logic
    syncSelectableGlows();

    // Recalculate live win percentage tracker in real time
    if (typeof recalculateWinPercentages === 'function') {
        recalculateWinPercentages();
    }
}

// Throttled/debounced wrapper around the win percentage calculations to save CPU cycles
let _recalcWinPercentTimeout = null;
function recalculateWinPercentages() {
    if (_recalcWinPercentTimeout) return;
    _recalcWinPercentTimeout = setTimeout(() => {
        _recalcWinPercentTimeout = null;
        executeWinPercentageCalculations();
        updateMiniScoreboard(); // Keep mini scoreboard in perfect lockstep
    }, 120);
}

// Real-time Win Percentage Calculations
function executeWinPercentageCalculations() {
    if (typeof state === 'undefined' || !state || !state.pawnPositions) return;
    const activeSlots = typeof getActivePlayerSlots === 'function' ? getActivePlayerSlots() : [0, 1, 2, 3];

    // Separate finished (ranked) from still-playing players
    const rankedSlots   = (state.rankings || []).filter(i => activeSlots.includes(i));
    const playingSlots  = activeSlots.filter(i => !rankedSlots.includes(i));

    const scores = [0, 0, 0, 0];

    // Only score players still actively playing
    playingSlots.forEach(i => {
        let score = 0;

        state.pawnPositions[i].forEach(pos => {
            if (pos !== -1) {
                score += pos;
                if (pos === getFinishPos()) score += 8;
            }
        });

        score += (state.captures[i] || 0) * 5;
        score -= (state.timesCaptured[i] || 0) * 4;
        score += (state.alienKills[i] || 0) * 3;

        scores[i] = Math.max(0, score);
    });

    // Total score across still-playing players only
    const activeTotalScore = playingSlots.reduce((sum, i) => sum + scores[i], 0);

    const percentages = [0, 0, 0, 0];

    if (playingSlots.length > 0) {
        if (activeTotalScore === 0) {
            // Equal share among still-playing players
            const equalShare = parseFloat((100 / playingSlots.length).toFixed(1));
            playingSlots.forEach(i => { percentages[i] = equalShare; });
            // Fix rounding to sum to exactly 100
            const diff = parseFloat((100 - playingSlots.reduce((s, i) => s + percentages[i], 0)).toFixed(1));
            if (Math.abs(diff) > 0.001) percentages[playingSlots[0]] = parseFloat((percentages[playingSlots[0]] + diff).toFixed(1));
        } else {
            playingSlots.forEach(i => {
                percentages[i] = parseFloat(((scores[i] / activeTotalScore) * 100).toFixed(1));
            });
            // Fix rounding drift
            const sum = playingSlots.reduce((s, i) => s + percentages[i], 0);
            const diff = parseFloat((100 - sum).toFixed(1));
            if (Math.abs(diff) > 0.001) {
                const topIdx = playingSlots.reduce((a, b) => scores[a] >= scores[b] ? a : b);
                percentages[topIdx] = parseFloat((percentages[topIdx] + diff).toFixed(1));
            }
        }
    }
    // Ranked (finished) players stay at 0 — displayed as rank only

    // Cache key to skip redundant DOM writes
    const pctKey = percentages.join(',') + '|' + activeSlots.join(',') + '|' + rankedSlots.join('-');
    if (window.__lastPercentagesKey === pctKey) return;
    window.__lastPercentagesKey = pctKey;

    const rankLabels = ['🏆 1ST', '🥈 2ND', '🥉 3RD', '💀 4TH'];

    // Find leading WR% among still-playing
    const playingPcts   = playingSlots.map(i => percentages[i]);
    const maxPercent    = playingPcts.length > 0 ? Math.max(...playingPcts) : 0;
    const isEgalitarian = playingPcts.length > 0 && playingPcts.every(p => p === playingPcts[0]);

    for (let i = 0; i < 4; i++) {
        const barElem  = document.getElementById(`pct-bar-inner-${i}`);
        const textElem = document.getElementById(`pct-text-${i}`);
        const playerWr = document.getElementById(`player-wr-${i}`);

        const rankIdx = rankedSlots.indexOf(i);
        const isRanked = rankIdx !== -1;

        if (isRanked) {
            // Finished player — show rank badge, blank out bar
            if (playerWr) {
                playerWr.innerText = rankLabels[rankIdx] || `${rankIdx + 1}TH`;
                playerWr.style.color = rankIdx === 0 ? '#ffd700'
                                     : rankIdx === 1 ? '#c0c0c0'
                                     : rankIdx === 2 ? '#cd7f32'
                                     : '#ff3366';
                playerWr.style.fontWeight = '900';
                playerWr.style.letterSpacing = '1px';
            }
            if (barElem)  { barElem.style.width = '0%'; barElem.classList.remove('leading-glow'); }
            if (textElem) { textElem.innerText = '—'; }
        } else if (activeSlots.includes(i)) {
            // Still-playing player — show WR%
            const pct = percentages[i];
            if (playerWr) {
                playerWr.innerText = `[ WR: ${pct.toFixed(0)}% ]`;
                playerWr.style.color = '';
                playerWr.style.fontWeight = '';
                playerWr.style.letterSpacing = '';
            }
            if (barElem && textElem) {
                barElem.style.width = `${pct}%`;
                textElem.innerText  = `${pct.toFixed(1)}%`;
                const isLeader = !isEgalitarian && pct === maxPercent && playingSlots.length > 1;
                if (isLeader) barElem.classList.add('leading-glow');
                else          barElem.classList.remove('leading-glow');
            }
        }
    }
}

// Starships glows sync
function syncSelectableGlows() {
    document.querySelectorAll('.pawn').forEach(el => {
        el.classList.remove('selectable', 'warpable');
    });

    if (state.isAnimating) return;

    // Simple highlights for clickable selection moving
    if (state.hasRolled && !state.activeWarpSelect && state.activeAlienSelect === -1) {
        const activePawns = state.pawnPositions[state.activePlayer];
        activePawns.forEach((pos, pawnIdx) => {
            const canMove = testCanMovePawn(state.activePlayer, pawnIdx, state.lastRoll);
            if (canMove) {
                const pawnDOM = document.getElementById(`pawn-${state.activePlayer}-${pawnIdx}`);
                if (pawnDOM) pawnDOM.classList.add('selectable');
            }
        });
    }

    // Purple highlight warp select
    if (state.activeWarpSelect) {
        const activePawns = state.pawnPositions[state.activePlayer];
        activePawns.forEach((pos, pawnIdx) => {
            if (pos >= 0 && pos < 55) {
                const pawnDOM = document.getElementById(`pawn-${state.activePlayer}-${pawnIdx}`);
                if (pawnDOM) pawnDOM.classList.add('warpable');
            }
        });
    }
}

// Rules modal dialog handlers
function openRulesModal() {
    const modal = document.getElementById('rules-modal');
    if (modal) modal.classList.add('active');
}

function closeRulesModal() {
    const modal = document.getElementById('rules-modal');
    if (modal) modal.classList.remove('active');
}

// Win and restart game logic
function triggerWinnerScreen(playerIdx) {
    if (typeof botTurnTimer !== 'undefined' && botTurnTimer) {
        clearTimeout(botTurnTimer);
        botTurnTimer = null;
    }

    if (typeof state !== 'undefined' && state.gameConfig) {
        state.gameConfig.gameStarted = false;
    }
    if (typeof clearSavedGameState === 'function') {
        clearSavedGameState();
    }

    const firstWinnerIdx = (state.rankings && state.rankings.length > 0) ? state.rankings[0] : playerIdx;
    const p = players[firstWinnerIdx];
    
    if (typeof registerMatchCompletion === 'function') {
        registerMatchCompletion(p.name, firstWinnerIdx);
    }

    playSynthSound(400, 1200, 1.5, 'sine');

    if (typeof state !== 'undefined' && state && state.gameConfig && state.gameConfig.gameStarted) {
        spawnConfetti();
    }

    const resultsWinnerBadge = document.getElementById('results-winner-badge');
    const resultsWinnerName = document.getElementById('results-winner-name');
    const resultsWinnerSub = document.getElementById('results-winner-sub');
    const resultsPilotStats = document.getElementById('results-pilot-stats');

    if (resultsWinnerBadge) {
        resultsWinnerBadge.innerText = isHuman(firstWinnerIdx) ? "🏆🎉" : "🤖🎉";
    }

    if (resultsWinnerName) {
        resultsWinnerName.innerText = `${p.name} WINS!`;
        resultsWinnerName.style.color = `var(--${p.color})`;
    }

    if (resultsWinnerSub) {
        resultsWinnerSub.innerText = isHuman(firstWinnerIdx) 
            ? "AMAZING! YOU ARE THE CHAMPION!" 
            : "GREAT TRY! ROBOT WINS THIS TIME!";
    }

    if (resultsPilotStats) {
        const slots = getActivePlayerSlots();
        let rankingsCopy = [...(state.rankings || [])];
        slots.forEach(s => {
            if (!rankingsCopy.includes(s)) {
                rankingsCopy.push(s);
            }
        });

        const rankIcons = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place", "💀 4th Place"];
        
        resultsPilotStats.innerHTML = rankingsCopy.map((pIdx, rIdx) => {
            const playerObj = players[pIdx];
            const isBotPlayer = isBot(pIdx);
            
            // Collect extra details for pilot stats
            const warpUsed = state.warpUsed[pIdx] ? "Used" : "Not Used";
            const alienKills = state.alienKills[pIdx] || 0;
            const aliensDeployed = (!state.aliensUsed[pIdx][0] ? 0 : 1) + (!state.aliensUsed[pIdx][1] ? 0 : 1);
            
            return `
                <div style="border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; color: var(--${playerObj.color}); font-weight: bold; font-size: 0.85rem;">
                        <span>${rankIcons[rIdx] || (rIdx + 1) + 'th Place'}</span>
                        <span>${escapeHTML(playerObj.name)} ${isBotPlayer ? '🤖' : '👤'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: #9cb3af; margin-top: 4px; padding-left: 4px;">
                        <span>Warp Core: ${warpUsed}</span>
                        <span>Aliens Deployed: ${aliensDeployed}/2</span>
                        <span>Exterminations: ${alienKills}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Restore standard Ludo action buttons on results screen
    const winActions = document.querySelector('.win-actions');
    if (winActions) {
        winActions.innerHTML = `
            <button type="button" class="action-btn roll-btn" onclick="restartGame(); navigateTo('game-screen');" style="flex: 1; padding:12px; font-size:0.8rem;">PLAY AGAIN</button>
            <button type="button" class="action-btn setup-rules-btn" onclick="navigateTo('home-screen');" style="flex: 1; padding:12px; font-size:0.8rem;">HOME</button>
        `;
    }

    if (typeof navigateTo === 'function') {
        navigateTo('results-screen');
    }
}

function restartGame() {
    playAgainSameConfig();
}

// Kinetic haptic-like visual screen shakes
function triggerBoardShake(intensity = 'medium') {
    const boardContainer = document.querySelector('.board-container');
    if (!boardContainer) return;

    // Reset previous shakes
    boardContainer.classList.remove('shake-light', 'shake-medium', 'shake-heavy');

    // Force DOM flow clean recalculation
    boardContainer.offsetHeight;

    // Apply the requested style
    boardContainer.classList.add(`shake-${intensity}`);

    // Cleanup class when finished to allow subsequent triggers
    setTimeout(() => {
        boardContainer.classList.remove(`shake-${intensity}`);
    }, 500);
}


// In-game custom prompt styled modal to replace window.prompt with space retro CSS theme
function openCustomPrompt(title, defaultValue, callback) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(5, 10, 26, 0.85)';
    overlay.style.backdropFilter = 'blur(6px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '99999';
    overlay.style.fontFamily = "'Orbitron', sans-serif";

    const dialog = document.createElement('div');
    dialog.style.background = 'radial-gradient(circle at center, #0d1b3e 0%, #050a1a 100%)';
    dialog.style.border = '2px solid var(--cyan)';
    dialog.style.boxShadow = '0 0 25px rgba(0, 229, 255, 0.45), inset 0 0 15px rgba(0, 229, 255, 0.15)';
    dialog.style.borderRadius = '12px';
    dialog.style.padding = '24px';
    dialog.style.width = '90%';
    dialog.style.maxWidth = '360px';
    dialog.style.boxSizing = 'border-box';
    dialog.style.textAlign = 'center';

    const titleEl = document.createElement('h3');
    titleEl.innerText = title.toUpperCase();
    titleEl.style.color = 'var(--cyan)';
    titleEl.style.fontSize = '1rem';
    titleEl.style.marginTop = '0';
    titleEl.style.marginBottom = '16px';
    titleEl.style.letterSpacing = '2px';
    titleEl.style.textShadow = '0 0 8px rgba(0, 229, 255, 0.6)';
    dialog.appendChild(titleEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.value = defaultValue;
    input.maxLength = 14;
    input.style.width = '100%';
    input.style.padding = '12px';
    input.style.background = 'rgba(13, 27, 62, 0.6)';
    input.style.border = '1px solid var(--cyan)';
    input.style.borderRadius = '6px';
    input.style.color = '#fff';
    input.style.fontSize = '1rem';
    input.style.textAlign = 'center';
    input.style.marginBottom = '20px';
    input.style.outline = 'none';
    input.style.textTransform = 'uppercase';
    input.style.boxShadow = 'inset 0 0 8px rgba(0, 229, 255, 0.1)';
    
    input.addEventListener('focus', () => {
        input.style.borderColor = 'var(--purple)';
        input.style.boxShadow = '0 0 10px rgba(191, 85, 236, 0.4), inset 0 0 8px rgba(191, 85, 236, 0.1)';
    });
    input.addEventListener('blur', () => {
        input.style.borderColor = 'var(--cyan)';
        input.style.boxShadow = 'inset 0 0 8px rgba(0, 229, 255, 0.1)';
    });
    dialog.appendChild(input);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.gap = '12px';
    btnRow.style.justifyContent = 'center';

    const cancelBtn = document.createElement('button');
    cancelBtn.innerText = 'ABORT';
    cancelBtn.style.flex = '1';
    cancelBtn.style.padding = '10px 16px';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.border = '1px solid rgba(255,255,255,0.3)';
    cancelBtn.style.borderRadius = '6px';
    cancelBtn.style.color = '#9cb3af';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '0.85rem';
    cancelBtn.style.fontWeight = 'bold';
    cancelBtn.style.transition = 'all 0.2s';
    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    btnRow.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.innerText = 'CONFIRM';
    saveBtn.style.flex = '1';
    saveBtn.style.padding = '10px 16px';
    saveBtn.style.background = 'var(--cyan)';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.color = '#050a1a';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontSize = '0.85rem';
    saveBtn.style.fontWeight = 'bold';
    saveBtn.style.transition = 'all 0.2s';
    saveBtn.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.3)';
    
    function submit() {
        const val = input.value.trim();
        document.body.removeChild(overlay);
        callback(val);
    }
    
    saveBtn.addEventListener('click', submit);
    btnRow.appendChild(saveBtn);

    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    input.focus();
    input.select();
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            submit();
        } else if (e.key === 'Escape') {
            document.body.removeChild(overlay);
        }
    });
}

// Intercept clicks on settings gear icon in game header and trigger pauseGame()
function hookSettingsGear() {
    const gearBtn = document.querySelector('button[title="Setup menu"]');
    if (gearBtn) {
        gearBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            pauseGame();
        };
    }
}

// Pause game modal functionality
function pauseGame() {
    if (typeof botTurnTimer !== 'undefined' && botTurnTimer) {
        clearTimeout(botTurnTimer);
        botTurnTimer = null;
    }

    if (typeof playSynthSound === 'function') {
        playSynthSound(300, 400, 0.4, 'sawtooth');
    }

    let pauseModal = document.getElementById('pause-game-modal');
    if (!pauseModal) {
        pauseModal = document.createElement('div');
        pauseModal.id = 'pause-game-modal';
        pauseModal.style.position = 'fixed';
        pauseModal.style.top = '0';
        pauseModal.style.left = '0';
        pauseModal.style.width = '100vw';
        pauseModal.style.height = '100vh';
        pauseModal.style.backgroundColor = 'rgba(5, 10, 26, 0.9)';
        pauseModal.style.backdropFilter = 'blur(8px)';
        pauseModal.style.display = 'flex';
        pauseModal.style.justifyContent = 'center';
        pauseModal.style.alignItems = 'center';
        pauseModal.style.zIndex = '100000';
        pauseModal.style.fontFamily = "'Orbitron', sans-serif";

        const box = document.createElement('div');
        box.style.background = 'radial-gradient(circle at center, #0d1b3e 0%, #050a1a 100%)';
        box.style.border = '2px solid var(--cyan)';
        box.style.boxShadow = '0 0 30px rgba(0, 229, 255, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.2)';
        box.style.borderRadius = '16px';
        box.style.padding = '32px';
        box.style.width = '85%';
        box.style.maxWidth = '360px';
        box.style.textAlign = 'center';
        
        const title = document.createElement('h2');
        title.innerText = 'MISSION PAUSED';
        title.style.color = 'var(--cyan)';
        title.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.7)';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '1.3rem';
        title.style.letterSpacing = '3px';
        box.appendChild(title);

        const sub = document.createElement('p');
        sub.innerText = 'COSMIC CORRIDOR SUSPENDED';
        sub.style.color = '#9cb3af';
        sub.style.fontSize = '0.7rem';
        sub.style.margin = '0 0 24px 0';
        sub.style.letterSpacing = '1px';
        box.appendChild(sub);

        const createButton = (text, colorVar, cb) => {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.style.width = '100%';
            btn.style.padding = '12px 16px';
            btn.style.margin = '8px 0';
            btn.style.background = `rgba(13, 27, 62, 0.7)`;
            btn.style.border = `1px solid var(--${colorVar})`;
            btn.style.borderRadius = '8px';
            btn.style.color = '#fff';
            btn.style.fontWeight = 'bold';
            btn.style.fontSize = '0.85rem';
            btn.style.letterSpacing = '1px';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s ease';
            
            btn.addEventListener('mouseenter', () => {
                btn.style.background = `var(--${colorVar})`;
                btn.style.color = '#050a1a';
                btn.style.boxShadow = `0 0 12px var(--${colorVar})`;
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'rgba(13, 27, 62, 0.7)';
                btn.style.color = '#fff';
                btn.style.boxShadow = 'none';
            });
            btn.addEventListener('click', cb);
            return btn;
        };

        const resumeBtn = createButton('🚀 RESUME FLIGHT', 'cyan', () => {
            document.body.removeChild(pauseModal);
            if (isBot(state.activePlayer)) {
                if (typeof scheduleBotTurn === 'function') {
                    scheduleBotTurn(600);
                }
            }
            if (typeof playSynthSound === 'function') {
                playSynthSound(450, 150, 0.4, 'sine');
            }
        });
        box.appendChild(resumeBtn);

        const restartBtn = createButton('🔄 RE-LAUNCH MATCH', 'yellow', () => {
            document.body.removeChild(pauseModal);
            if (typeof playAgainSameConfig === 'function') {
                playAgainSameConfig();
            }
        });
        box.appendChild(restartBtn);

        const quitBtn = createButton('💀 RETREAT TO SHIP', 'red', () => {
            document.body.removeChild(pauseModal);
            if (typeof returnToSetup === 'function') {
                returnToSetup();
            }
        });
        box.appendChild(quitBtn);

        pauseModal.appendChild(box);
    }

    document.body.appendChild(pauseModal);
}

// Mini HUD scoreboard creation and sync implementation
function getOrCreateMiniScoreboard() {
    let scoreboard = document.getElementById('mini-scoreboard-overlay');
    if (!scoreboard) {
        scoreboard = document.createElement('div');
        scoreboard.id = 'mini-scoreboard-overlay';
        scoreboard.className = 'collapsed';
        
        const style = document.createElement('style');
        style.innerHTML = `
            #mini-scoreboard-overlay {
                position: fixed;
                top: 80px;
                right: 12px;
                z-index: 999;
                background: rgba(13, 27, 62, 0.9);
                border: 1px solid var(--cyan);
                border-radius: 8px;
                width: 240px;
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
                font-family: 'Orbitron', 'Segoe UI', sans-serif;
                color: #fff;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            }
            #mini-scoreboard-overlay.collapsed {
                width: 44px;
                height: 40px;
            }
            .scoreboard-toggle-btn {
                background: radial-gradient(circle at center, #0d1b3e 0%, #050a1a 100%);
                border: none;
                color: var(--cyan);
                width: 100%;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 12px;
                cursor: pointer;
                font-weight: bold;
                font-size: 0.82rem;
                letter-spacing: 1px;
                transition: background 0.2s;
                gap: 4px;
            }
            .scoreboard-toggle-btn:hover {
                background: rgba(0, 229, 255, 0.15);
            }
            .scoreboard-content {
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                font-size: 0.75rem;
            }
            #mini-scoreboard-overlay.collapsed .scoreboard-content {
                display: none;
            }
            .sb-player-row {
                border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
                padding-bottom: 8px;
            }
            .sb-player-row:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .sb-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
                font-weight: bold;
            }
            .sb-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 130px;
            }
            .sb-stats-row {
                display: flex;
                justify-content: space-between;
                color: #a4b3d6;
                font-size: 0.65rem;
                margin-top: 4px;
            }
            .sb-stat-item {
                display: flex;
                align-items: center;
                gap: 3px;
            }
            .sb-progress-container {
                background: rgba(255, 255, 255, 0.08);
                border-radius: 4px;
                height: 6px;
                overflow: hidden;
                margin-top: 4px;
                border: 1px solid rgba(255, 255, 255, 0.04);
            }
            .sb-progress-bar {
                height: 100%;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);

        scoreboard.innerHTML = `
            <button type="button" class="scoreboard-toggle-btn" onclick="toggleMiniScoreboard()">
                <span class="sb-title">📊 HUD</span>
                <span class="sb-arrow">◀</span>
            </button>
            <div class="scoreboard-content" id="mini-scoreboard-content">
            </div>
        `;

        document.body.appendChild(scoreboard);

        // Minimize MISSION HUD when touched anywhere on screen (excluding the toggle button itself)
        document.addEventListener('pointerdown', (e) => {
            const sb = document.getElementById('mini-scoreboard-overlay');
            if (sb && !sb.classList.contains('collapsed')) {
                const btn = sb.querySelector('.scoreboard-toggle-btn');
                if (btn && !btn.contains(e.target)) {
                    sb.classList.add('collapsed');
                    const arrow = sb.querySelector('.sb-arrow');
                    const title = sb.querySelector('.sb-title');
                    if (arrow) arrow.innerText = '◀';
                    if (title) title.innerText = '📊 HUD';
                }
            }
        }, { passive: true });
    }
    return scoreboard;
}

window.toggleMiniScoreboard = function() {
    const sb = document.getElementById('mini-scoreboard-overlay');
    if (sb) {
        sb.classList.toggle('collapsed');
        const arrow = sb.querySelector('.sb-arrow');
        const title = sb.querySelector('.sb-title');
        if (sb.classList.contains('collapsed')) {
            if (arrow) arrow.innerText = '◀';
            if (title) title.innerText = '📊 HUD';
        } else {
            if (arrow) arrow.innerText = '▶';
            if (title) title.innerText = '📊 MISSION HUD';
        }
    }
};

function updateMiniScoreboard() {
    const sb = document.getElementById('mini-scoreboard-overlay');
    if (sb) {
        sb.style.display = 'none';
        sb.remove();
    }
}

// High-performance event delegation for pawns click actions to eliminate listener duplication
document.addEventListener('click', (e) => {
    const pawn = e.target.closest('.pawn');
    if (pawn) {
        const playerIdx = parseInt(pawn.getAttribute('data-player'), 10);
        const pawnIdx = parseInt(pawn.getAttribute('data-pawn'), 10);
        if (!isNaN(playerIdx) && !isNaN(pawnIdx)) {
            e.stopPropagation();
            if (typeof handlePawnClick === 'function') {
                handlePawnClick(playerIdx, pawnIdx);
            }
        }
    }
});
window.spaceLudoFastForwardBots = false;
function toggleFastForward() {
    window.spaceLudoFastForwardBots = !window.spaceLudoFastForwardBots;
    const btn = document.getElementById('ff-toggle');
    if (btn) {
        if (window.spaceLudoFastForwardBots) {
            btn.style.opacity = '1';
            btn.style.boxShadow = '0 0 10px var(--cyan)';
            raiseToast('? BOTS FAST-FORWARD ENGAGED!', '?');
        } else {
            btn.style.opacity = '0.5';
            btn.style.boxShadow = 'none';
            raiseToast('? BOTS FAST-FORWARD DISABLED!', '?');
        }
    }
}

// Inject capture disintegration styles
if (typeof document !== 'undefined' && !document.getElementById('capture-explode-styles')) {
    const style = document.createElement('style');
    style.id = 'capture-explode-styles';
    style.innerHTML = `
        @keyframes captureExplode {
            0% { transform: scale(1); opacity: 1; filter: brightness(1); }
            50% { transform: scale(1.5) rotate(45deg); opacity: 0.8; filter: brightness(2) drop-shadow(0 0 10px red); }
            100% { transform: scale(0) rotate(90deg); opacity: 0; filter: brightness(3); }
        }
        .pawn-exploding {
            animation: captureExplode 0.4s ease-out forwards !important;
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

// MULTIPLAYER LOBBY UI CONTROLLERS
function openMultiplayerLobby() {
    navigateTo('multiplayer-lobby-screen');
    const authStatus = document.getElementById('mp-auth-status');
    const actions = document.getElementById('mp-actions');
    
    authStatus.innerText = "Connecting to Firebase network...";
    actions.style.display = 'none';
    document.getElementById('mp-room-lobby').style.display = 'none';

    if (window.Multiplayer) {
        window.Multiplayer.init().then(() => {
            authStatus.innerText = "Connection Established. Identity Secured.";
            actions.style.display = 'flex';
        }).catch(err => {
            authStatus.innerText = "Network Error: " + err.message;
            authStatus.style.color = 'red';
        });
    } else {
        authStatus.innerText = "Network Module Offline. (Check console for import errors)";
    }
}

window.openMultiplayerLobby = openMultiplayerLobby;

function closeMultiplayerLobby() {
    const lobby = document.getElementById('mp-room-lobby');
    const actions = document.getElementById('mp-actions');
    if (lobby && lobby.style.display !== 'none') {
        lobby.style.display = 'none';
        actions.style.display = 'flex';
    } else {
        navigateTo('home-screen');
    }
}
window.closeMultiplayerLobby = closeMultiplayerLobby;

async function hostMultiplayerRoom() {
    if (!window.Multiplayer) return;
    if ((commanderProfile.stars || 0) < 100) {
        raiseToast("Insufficient stars! Entry requires 100 Stars. Play offline modes to earn more.", "🌌");
        return;
    }
    try {
        const roomId = await window.Multiplayer.createRoom();
        document.getElementById('mp-actions').style.display = 'none';
        document.getElementById('mp-room-lobby').style.display = 'block';
        document.getElementById('mp-room-code-display').innerText = roomId;
        document.getElementById('mp-p1-status').innerText = "Connected (You)";
        document.getElementById('mp-start-btn').style.display = 'block';
    } catch (err) {
        alert("Failed to host room: " + err.message);
    }
}
window.hostMultiplayerRoom = hostMultiplayerRoom;

async function joinMultiplayerRoom() {
    if (!window.Multiplayer) return;
    if ((commanderProfile.stars || 0) < 100) {
        raiseToast("Insufficient stars! Entry requires 100 Stars. Play offline modes to earn more.", "🌌");
        return;
    }
    const code = document.getElementById('mp-join-code').value.trim();
    if (code.length !== 6) return alert("Enter a valid 6-digit code.");
    
    try {
        const result = await window.Multiplayer.joinRoom(code);
        document.getElementById('mp-actions').style.display = 'none';
        document.getElementById('mp-room-lobby').style.display = 'block';
        document.getElementById('mp-room-code-display').innerText = result.roomId;
        
        // Host controls start match
        document.getElementById('mp-start-btn').style.display = 'none';
        
    } catch (err) {
        alert("Failed to join room: " + err.message);
    }
}
window.joinMultiplayerRoom = joinMultiplayerRoom;

async function quickMatchMultiplayer() {
    if (!window.Multiplayer) return;
    if ((commanderProfile.stars || 0) < 100) {
        raiseToast("Insufficient stars! Entry requires 100 Stars. Play offline modes to earn more.", "🌌");
        return;
    }
    document.getElementById('mp-auth-status').innerText = "Searching the cosmos for opponents...";
    
    try {
        const result = await window.Multiplayer.quickMatch();
        
        if (result.error === 'unavailable') {
            raiseToast("No opponents currently available for Quick Match. Please try again later.", "📡");
            document.getElementById('mp-auth-status').innerText = "";
            return;
        }

        document.getElementById('mp-actions').style.display = 'none';
        document.getElementById('mp-room-lobby').style.display = 'block';
        document.getElementById('mp-room-code-display').innerText = result.roomId;
        
        if (result.slot === 0) {
            document.getElementById('mp-p1-status').innerText = "Connected (You)";
            document.getElementById('mp-start-btn').style.display = 'block';
        } else {
            document.getElementById('mp-start-btn').style.display = 'none';
        }
    } catch (err) {
        alert("Matchmaking failed: " + err.message);
        document.getElementById('mp-auth-status').innerText = "Connection Established. Identity Secured.";
    }
}
window.quickMatchMultiplayer = quickMatchMultiplayer;

// Update lobby UI when players join
window.addEventListener('multiplayer-players-updated', (e) => {
    const players = e.detail;
    for (let i = 0; i <= 3; i++) {
        const span = document.getElementById(`mp-p${i+1}-status`);
        if (span) {
            if (players[i]) {
                const uid = players[i];
                const profile = window.onlinePlayersProfiles && window.onlinePlayersProfiles[uid];
                const name = profile ? profile.name : "LOADING...";
                const species = profile ? profile.species : "Terran (Human)";
                const emoji = SPECIES_EMOJIS[species] || "🧑‍🚀";
                
                span.innerText = `${emoji} ${name}${uid === window.Multiplayer.userId ? " (You)" : ""}`;
                span.style.color = "#10b981";
            } else {
                span.innerText = "Empty";
                span.style.color = "#64748b";
            }
        }
    }
});

function startMultiplayerMatch() {
    if (!window.Multiplayer) return;
    
    // Set game config for multiplayer
    const activeSlots = [0, 1, 2, 3].filter(i => window.onlinePlayersMap && window.onlinePlayersMap[i]);
    const pTypes = ['bot', 'bot', 'bot', 'bot'];
    activeSlots.forEach(i => pTypes[i] = 'human');
    
    state.gameConfig = {
        mode: 'passAndPlay',
        playerCount: activeSlots.length,
        playerTypes: pTypes,
        botDifficulty: 'none',
        humanColorIndex: window.Multiplayer.mySlotIdx,
        ufoCount: 4,
        gameStarted: true
    };
    state.isMultiplayer = true;
    
    // Tell clients to start
    window.Multiplayer.broadcastAction('GAME_START', { config: state.gameConfig });
    
    startGameFromSetup();
}
window.startMultiplayerMatch = startMultiplayerMatch;

window.triggerNewGame = function() {
    if (typeof closeSetupModal === 'function') {
        closeSetupModal();
    }
    const mpLobby = document.getElementById('multiplayer-lobby-screen');
    if (mpLobby) {
        mpLobby.style.display = 'none';
        mpLobby.classList.add('hidden');
    }

    const wrapper = document.querySelector('.game-wrapper');
    if (wrapper) wrapper.classList.remove('game-hidden');

    if (typeof beginMatch === 'function') {
        beginMatch();
    }

    if (typeof navigateTo === 'function') {
        navigateTo('game-screen');
    }
};
