function getDiceSixProbability() {
    return (window.state && window.state.gameConfig && window.state.gameConfig.mode === 'miniLudo') ? 0.30 : 0.20;
}

// Dynamic Dice history log tracker
function updateDiceHistoryLog(roll, playerIdx) {
    if (typeof document === 'undefined') return;
    
    if (!state.diceHistory) {
        state.diceHistory = [];
    }
    
    state.diceHistory.unshift({ roll, playerIdx });
    
    if (state.diceHistory.length > 5) {
        state.diceHistory.pop();
    }
    
    const turnIndicator = document.getElementById('turn-indicator');
    if (!turnIndicator) return;
    
    let logElem = document.getElementById('dice-history-log');
    if (!logElem) {
        logElem = document.createElement('div');
        logElem.id = 'dice-history-log';
        logElem.style.cssText = `
            grid-column: 1 / span 2;
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            margin: 4px 0 8px 0;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.65rem;
            color: #9cb3af;
            letter-spacing: 1px;
        `;
        turnIndicator.parentNode.insertBefore(logElem, turnIndicator.nextSibling);
    }
    
    const pNames = (typeof players !== 'undefined') ? players : [];
    
    const itemsHtml = state.diceHistory.map(item => {
        const pObj = pNames[item.playerIdx] || { color: 'cyan', name: 'Pilot' };
        const colorVar = pObj.color || 'cyan';
        
        return `
            <div class="dice-history-item" style="
                width: 22px;
                height: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                border: 1px solid var(--${colorVar}, #00e5ff);
                background: rgba(0, 0, 0, 0.45);
                box-shadow: 0 0 6px var(--${colorVar}, rgba(0, 229, 255, 0.3));
                color: #ffffff;
                font-size: 0.75rem;
                font-weight: 900;
                position: relative;
                transition: all 0.3s ease;
            " title="${pObj.name} rolled ${item.roll}">
                ${item.roll}
            </div>
        `;
    }).join('');
    
    logElem.innerHTML = `
        <span style="opacity: 0.7; margin-right: 4px; font-weight: bold;">ROLL HISTORY:</span>
        <div style="display: flex; gap: 6px; align-items: center;">
            ${itemsHtml || '<span style="opacity: 0.5;">None</span>'}
        </div>
    `;
}

// Test if a pawn can move
function testCanMovePawn(playerIdx, pawnIdx, roll) {
    const pos = state.pawnPositions[playerIdx][pawnIdx];
    const finishPos = getFinishPos();
    if (pos === finishPos) return false;
    if (pos === -1 && roll !== 6) return false;
    if (pos + roll > finishPos) return false;
    return true;
}

// Individual Player Dice System and Shims
if (!state.consecutiveSixesCount) {
    state.consecutiveSixesCount = [0, 0, 0, 0];
}

function init3DDiceInteractiveLogic() {
    const diceContainer = document.getElementById('board-3d-dice-container');
    if (diceContainer) {
        diceContainer.addEventListener('click', () => {
            const activePlayer = (typeof state !== 'undefined') ? state.activePlayer : null;
            if (activePlayer !== null && !state.hasRolled && !state.isAnimating && !isBot(activePlayer)) {
                rollPlayerDice(activePlayer);
            }
        });
    }
}

function rollPlayerDice(playerIdx) {
    if (state.isAnimating || state.hasRolled || playerIdx !== state.activePlayer) return;
    
    const consecutive6 = (state.consecutiveSixesCount && state.consecutiveSixesCount[playerIdx]) || 0;
    
    startAudioContext();
    const baseFreq = 440 + (consecutive6 * 100);
    playSynthSound(baseFreq, baseFreq * 2, 0.2, 'triangle');
    
    // Haptic vibration feedback on roll action
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(60);
    }
    
    state.isAnimating = true;
    state.hasRolled = true;
    
    if (!state.consecutiveSixesCount) {
        state.consecutiveSixesCount = [0, 0, 0, 0];
    }
    // consecutive6 already declared above
    let roll = 1;
    
    // MULTIPLAYER OVERRIDE
    if (window.__forceNextRollValue !== undefined) {
        roll = window.__forceNextRollValue;
        window.__forceNextRollValue = undefined;
        // Skip bust logic if forced from network, or process it? The host/sender already processed it.
    } else {
        // --- FAIRNESS GUARANTEE ---
        // If player has all pawns in base, and every other active player has at least one pawn out,
        // and this player has gone >=2 full rounds without a 6, guarantee a 6.
        let fairnessForced = false;
        const allInBase = state.pawnPositions[playerIdx].every(p => p === -1);
        if (allInBase) {
            const slots = getActivePlayerSlots();
            const allOthersHaveOut = slots
                .filter(i => i !== playerIdx)
                .every(i => state.pawnPositions[i].some(p => p >= 0));
            if (allOthersHaveOut) {
                if (!state.roundsWithoutSix) state.roundsWithoutSix = [0, 0, 0, 0];
                // Check if we should force a 6
                if (state.roundsWithoutSix[playerIdx] >= 2) {
                    roll = 6;
                    fairnessForced = true;
                    state.roundsWithoutSix[playerIdx] = 0; // reset after fairness 6
                } else {
                    // Balanced odds defined by constant standard Ludo roll chance
                    if (Math.random() < getDiceSixProbability()) {
                        roll = 6;
                        state.roundsWithoutSix[playerIdx] = 0;
                    } else {
                        roll = Math.floor(Math.random() * 5) + 1;
                    }
                }
            } else {
                // Balanced odds defined by constant standard Ludo roll chance
                if (Math.random() < getDiceSixProbability()) {
                    roll = 6;
                } else {
                    roll = Math.floor(Math.random() * 5) + 1;
                }
            }
        } else {
            // Balanced odds defined by constant standard Ludo roll chance
            if (Math.random() < getDiceSixProbability()) {
                roll = 6;
            } else {
                roll = Math.floor(Math.random() * 5) + 1;
            }
        }
        
        // Remove 3-sixes rule: Cap the third roll to 5 if player has rolled two 6s
        // BUT skip this rule if we fairness-forced a 6 to help a stuck player.
        if (!fairnessForced && consecutive6 >= 2 && roll === 6) {
            roll = Math.floor(Math.random() * 5) + 1;
        }
    }
    
    if (state.isMultiplayer && window.Multiplayer && window.__forceNextRollValue === undefined) {
        // Broadcast this roll to the network if we generated it locally
        window.Multiplayer.broadcastAction('ROLL_DICE', { playerIdx, roll });
    }
    

    
    if (roll === 6) {
        state.consecutiveSixesCount[playerIdx] = consecutive6 + 1;
        // Track that this player has rolled a 6 at least once (for fairness tracking)
        if (!state.playerHasGottenSix) state.playerHasGottenSix = [false, false, false, false];
        state.playerHasGottenSix[playerIdx] = true;
        if (typeof triggerEmojiReaction === 'function') {
            triggerEmojiReaction('roll_six', playerIdx);
        }
    } else {
        state.consecutiveSixesCount[playerIdx] = 0;
    }
    
    state.lastRoll = roll;
    
    // Animate the dice!
    const board3DContainer = document.getElementById('board-3d-dice-container');
    const cube3D = document.getElementById('cube-3d');
    const diceElem = document.getElementById(`player-dice-${playerIdx}`);
    const diceContainer = document.getElementById(`player-dice-container-${playerIdx}`);
    
    if (board3DContainer && cube3D) {
        // Show 3D Dice center panel
        board3DContainer.style.display = 'block';
        board3DContainer.classList.remove('active-green', 'active-yellow', 'active-red', 'active-blue', 'dice-highlight-glowing');
        const pObj = (typeof players !== 'undefined') ? players[playerIdx] : null;
        const pColor = pObj ? pObj.color : 'green';
        board3DContainer.classList.add(`active-${pColor}`);
        
        if (diceContainer) {
            diceContainer.classList.remove('active-roll-glowing');
        }
        
        let startTime = performance.now();
        let rotX = 0, rotY = 0, rotZ = 0;
        let velX = 15 + Math.random() * 15;
        let velY = 15 + Math.random() * 15;
        let velZ = 10 + Math.random() * 10;
        
        cube3D.style.setProperty('transition', 'none', 'important');
        
        let lastClatterTime = 0;
        
        function anim3DDice(now) {
            const elapsed = now - startTime;
            if (elapsed < 800) {
                rotX += velX;
                rotY += velY;
                rotZ += velZ;
                velX *= 0.95;
                velY *= 0.95;
                velZ *= 0.95;
                
                cube3D.style.setProperty('transform', `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`, 'important');
                
                // Procedural roll clatter sounds
                if (now - lastClatterTime > 75) {
                    if (typeof playRealisticDiceClatter === 'function') {
                        playRealisticDiceClatter();
                    }
                    lastClatterTime = now;
                }
                
                requestAnimationFrame(anim3DDice);
            } else {
                // Settle face alignment target
                const faceRotations = {
                    1: { x: 0, y: 0 },
                    2: { x: -90, y: 0 },
                    3: { x: 0, y: -90 },
                    4: { x: 0, y: 90 },
                    5: { x: 90, y: 0 },
                    6: { x: 180, y: 0 }
                };
                const targetRot = faceRotations[roll] || { x: 0, y: 0 };
                
                if (typeof playRealisticDiceLanding === 'function') {
                    playRealisticDiceLanding();
                }
                if (typeof triggerBoardShake === 'function') {
                    triggerBoardShake('light');
                }
                
                cube3D.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', 'important');
                cube3D.style.setProperty('transform', `rotateX(${targetRot.x}deg) rotateY(${targetRot.y}deg) rotateZ(0deg)`, 'important');
                
                // Display resolved dot face on panel backup
                displayDiceDots(playerIdx, roll);
                
                // Show number notation helper overlay in center
                const notation = document.getElementById('dice-number-notation');
                if (notation) {
                    const pObj = (typeof players !== 'undefined') ? players[playerIdx] : null;
                    const pColorName = pObj ? pObj.color : 'cyan';
                    notation.style.color = `var(--${pColorName})`;
                    notation.innerText = roll;
                    notation.classList.add('show');
                }

                // Haptic feedback double vibration
                if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate([45, 30, 45]);
                }
                
                setTimeout(() => {
                    if (board3DContainer) {
                        board3DContainer.style.display = 'none';
                    }
                    if (notation) {
                        notation.classList.remove('show');
                    }
                    completeRollLifecycle(roll, playerIdx);
                }, 800);
            }
        }
        requestAnimationFrame(anim3DDice);
    } else if (diceContainer && diceElem) {
        // Fallback flat dice animations
        diceContainer.classList.add('rolling-spin');
        diceContainer.classList.remove('active-roll-glowing');
        
        const containerRect = diceContainer.getBoundingClientRect();
        const diceCenterX = containerRect.left + containerRect.width / 2;
        const diceCenterY = containerRect.top + containerRect.height / 2;
        
        const boardContainer = document.querySelector('.board-container');
        const boardRect = boardContainer ? boardContainer.getBoundingClientRect() : null;
        
        let ticks = 0;
        const maxTicks = 12;
        const intervalTime = 80;
        let rotationAngle = 0;
        
        diceElem.style.zIndex = '10000';
        
        const ticker = setInterval(() => {
            const randVal = Math.floor(Math.random() * 6) + 1;
            displayDiceDots(playerIdx, randVal);
            playSynthSound(500 + Math.random() * 250, 600 + Math.random() * 250, 0.04, 'sawtooth');
            ticks++;
            
            if (ticks < maxTicks - 1) {
                if (boardRect) {
                    const padding = 40;
                    const minX = boardRect.left + padding;
                    const maxX = boardRect.right - padding;
                    const minY = boardRect.top + padding;
                    const maxY = boardRect.bottom - padding;
                    
                    const randX = minX + Math.random() * (maxX - minX);
                    const randY = minY + Math.random() * (maxY - minY);
                    
                    const offsetX = randX - diceCenterX;
                    const offsetY = randY - diceCenterY;
                    rotationAngle += 180 + Math.floor(Math.random() * 180);
                    
                    diceElem.style.transition = 'transform 0.09s ease-out';
                    diceElem.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1.6) rotate(${rotationAngle}deg)`;
                }
            } else if (ticks === maxTicks - 1) {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const finalOffsetX = centerX - diceCenterX;
                const finalOffsetY = centerY - diceCenterY;
                rotationAngle += 360;
                
                diceElem.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                diceElem.style.transform = `translate(${finalOffsetX}px, ${finalOffsetY}px) scale(2.2) rotate(${rotationAngle}deg)`;
            } else {
                clearInterval(ticker);
                displayDiceDots(playerIdx, roll);
                playSynthSound(350, 440, 0.25, 'triangle');
                triggerBoardShake('light');
                
                // Show number notation helper overlay in center
                const notation = document.getElementById('dice-number-notation');
                if (notation) {
                    const pObj = (typeof players !== 'undefined') ? players[playerIdx] : null;
                    const pColorName = pObj ? pObj.color : 'cyan';
                    notation.style.color = `var(--${pColorName})`;
                    notation.innerText = roll;
                    notation.classList.add('show');
                }
                
                if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
                    navigator.vibrate([40, 30, 40]);
                }
                
                setTimeout(() => {
                    if (diceElem) {
                        rotationAngle += 720;
                        diceElem.style.transition = 'transform 0.85s cubic-bezier(0.19, 1, 0.22, 1)';
                        diceElem.style.transform = `translate(0, 0) scale(1) rotate(${rotationAngle}deg)`;
                    }
                    if (notation) {
                        notation.classList.remove('show');
                    }
                    setTimeout(() => {
                        if (diceElem) {
                            diceElem.style.transition = '';
                            diceElem.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
                            diceElem.style.zIndex = '';
                        }
                        if (diceContainer) {
                            diceContainer.classList.remove('rolling-spin');
                        }
                        completeRollLifecycle(roll, playerIdx);
                    }, 850);
                }, 750);
            }
        }, intervalTime);
    }
}

function completeRollLifecycle(roll, playerIdx) {
    state.isAnimating = false;
    
    // Instantly refresh player turn highlighting displays to align with roll result
    if (typeof updateTurnUIVisually === 'function') {
        updateTurnUIVisually();
    }
    
    // Update visual dice history log widget
    updateDiceHistoryLog(roll, playerIdx);
    
    const activePawns = state.pawnPositions[playerIdx];
    const allInBase = activePawns.every(pos => pos === -1);
    const isBotPlayer = isBot(playerIdx);

    if (allInBase && isBotPlayer && roll !== 6) {
        // Bot did not roll a 6 and has no pawns on board — pass turn, no retry
        setTimeout(() => passTurn(), 800);
        return;
    }

    const availableMoves = activePawns.map((p, idx) => testCanMovePawn(playerIdx, idx, roll));
    const hasValidMove = availableMoves.some(m => m === true);
    
    if (!hasValidMove) {
        const indicator = document.getElementById('turn-indicator');
        if (indicator) {
            indicator.innerText = `NO MOVEMENTS AVAILABLE`;
            indicator.style.color = '#ff3366';
        }
        if (typeof triggerEmojiReaction === 'function') {
            triggerEmojiReaction('lose_turn', playerIdx);
        }
        setTimeout(() => {
            passTurn();
        }, 1200);
    } else {
        const autoMoved = (typeof applyPostRollMovement === 'function') ? applyPostRollMovement(playerIdx, roll) : false;
        
        if (!autoMoved) {
            syncSelectableGlows();
            if (isBot(playerIdx)) {
                scheduleBotTurn(500);
            }
        }
    }
}

function rollDice(playerIdx) {
    rollPlayerDice(playerIdx);
}

function displayDiceDots(playerIdx, value) {
    const diceElem = document.getElementById(`player-dice-${playerIdx}`);
    if (!diceElem) return;
    
    diceElem.innerHTML = '';
    
    const dotPositions = {
        1: [4],
        2: [0, 8],
        3: [0, 4, 8],
        4: [0, 2, 6, 8],
        5: [0, 2, 4, 6, 8],
        6: [0, 2, 3, 5, 6, 8]
    };
    
    const activeIndices = dotPositions[value] || [4];
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'dice-dot-cell';
        if (activeIndices.includes(i)) {
            const dot = document.createElement('div');
            dot.className = 'dice-dot';
            cell.appendChild(dot);
        }
        diceElem.appendChild(cell);
    }
}

function passTurn() {
    // Hard guard: never run turn logic after the game has ended
    if (state.rankings && typeof getActivePlayerSlots === 'function') {
        if (state.rankings.length >= getActivePlayerSlots().length) return;
    }

    // FIX #5: Always clear activePowerUpTarget on turn pass — only Crystal Storm (frozenTurns)
    // should affect the next player. Dangling target state must NOT carry over between turns.
    state.activePowerUpTarget = null;
    // FIX #1: Clear auto-move pending flag on turn pass
    state.autoMovePending = false;

    state.hasRolled = false;
    state.lastRoll = 0;
    state.activeWarpSelect = false;
    state.activeAlienSelect = -1;
    
    const banner = document.getElementById('board-instruction-overlay');
    if (banner) banner.classList.remove('active');

    // Tick down temporary safe zone durations at the turn boundaries
    if (typeof gamePowerUpEngine !== 'undefined') {
        gamePowerUpEngine.tickPowerUpZones();
    }

    // Tick down shieldedPawns and burningPawns of the player who is yielding the turn
    const yieldingPlayer = state.activePlayer;

    // FIX #3: Track rounds without a 6 for fairness guarantee
    if (state.pawnPositions[yieldingPlayer].every(p => p === -1)) {
        // Player still has all UFOs in base — count this as a round without a 6
        if (!state.roundsWithoutSix) state.roundsWithoutSix = [0, 0, 0, 0];
        state.roundsWithoutSix[yieldingPlayer]++;
    } else {
        // Player has at least one UFO out, reset their counter
        if (state.roundsWithoutSix) state.roundsWithoutSix[yieldingPlayer] = 0;
    }

    if (state.shieldedPawns && state.shieldedPawns[yieldingPlayer]) {
        const shieldCount = state.shieldedPawns[yieldingPlayer].length;
        for (let i = 0; i < shieldCount; i++) {
            if (state.shieldedPawns[yieldingPlayer][i] > 0) {
                state.shieldedPawns[yieldingPlayer][i]--;
                if (state.shieldedPawns[yieldingPlayer][i] === 0) {
                    raiseToast(`🛡️ ${players[yieldingPlayer].name}'s starship ${i + 1} shield has dissipated!`, "🛡️");
                }
            }
        }
    }
    if (state.burningPawns && state.burningPawns[yieldingPlayer]) {
        const burnCount = state.burningPawns[yieldingPlayer].length;
        for (let i = 0; i < burnCount; i++) {
            if (state.burningPawns[yieldingPlayer][i] > 0) {
                state.burningPawns[yieldingPlayer][i]--;
                if (state.burningPawns[yieldingPlayer][i] === 0) {
                    raiseToast(`🔥 ${players[yieldingPlayer].name}'s starship ${i + 1} is no longer burning!`, "🔥");
                }
            }
        }
    }

    let nextPlayer = getNextPlayerInRotation(state.activePlayer);
    let skippedPlayers = [];

    // Skip frozen players iteratively to avoid stacked timeouts & recursive passTurn()
    while (state.frozenTurns && state.frozenTurns[nextPlayer] > 0 && nextPlayer !== state.activePlayer) {
        state.frozenTurns[nextPlayer]--;
        skippedPlayers.push(nextPlayer);
        
        // Clean up visual status of panel
        const panel = document.getElementById(`panel-${nextPlayer}`);
        if (panel) {
            panel.classList.remove('frozen-panel');
        }
        
        nextPlayer = getNextPlayerInRotation(nextPlayer);
    }

    state.activePlayer = nextPlayer;

    if (skippedPlayers.length > 0) {
        skippedPlayers.forEach((pIdx, index) => {
            setTimeout(() => {
                const pName = (typeof players !== 'undefined' && players[pIdx]) ? players[pIdx].name : `UFO ${pIdx}`;
                raiseToast(`❄️ COSMIC CRYO-STORM OVERDRIVE! ${pName} skips frozen turn! ❄️`, "❄️");
                playSynthSound(250, 180, 0.6, 'sine');
            }, index * 800);
        });
    }

    if (!state.turnCounter) state.turnCounter = 0;
    state.turnCounter++;
    const activeSlotCount = typeof getActivePlayerSlots === 'function' ? getActivePlayerSlots().length : 4;
    
    if (state.turnCounter % activeSlotCount === 0) {
        if (typeof tickAliensMovement === 'function') {
            tickAliensMovement();
        }
    }

    renderPawns();
    updateTurnUIVisually();
}
