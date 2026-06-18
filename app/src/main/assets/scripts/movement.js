function stepsToFinish(pos) {
    const finishPos = getFinishPos();
    if (pos < 0 || pos >= finishPos) return Infinity;
    return finishPos - pos;
}

function getActiveTrackPawns(playerIdx) {
    const finishPos = getFinishPos();
    return state.pawnPositions[playerIdx]
        .map((pos, idx) => ({ pos, idx }))
        .filter(p => p.pos >= 0 && p.pos < finishPos);
}

function getMovablePawnIndices(playerIdx, roll) {
    const movable = [];
    const pawns = state.pawnPositions[playerIdx];
    const ufoCount = pawns ? pawns.length : 4;
    for (let i = 0; i < ufoCount; i++) {
        if (testCanMovePawn(playerIdx, i, roll)) {
            movable.push(i);
        }
    }
    return movable;
}

function countPawnsInBase(playerIdx) {
    return state.pawnPositions[playerIdx].filter(pos => pos === -1).length;
}

/**
 * Auto-move only when exactly one legal move exists (or multiple equivalent ones).
 */
function resolveAutoMovePawn(playerIdx, roll) {
    const movable = getMovablePawnIndices(playerIdx, roll);
    if (movable.length === 0) return null;

    // SCENARIO 1: Exactly 1 movable pawn
    if (movable.length === 1) {
        return movable[0];
    }

    // SCENARIO 2: Multiple movable pawns, but all of them are inside the Base (position === -1)
    // and we rolled a 6. In this case, launching a pawn is the sole unique legal action type.
    const allMovableAreInBase = movable.every(idx => state.pawnPositions[playerIdx][idx] === -1);
    if (allMovableAreInBase) {
        return movable[0];
    }

    // SCENARIO 3: Multiple movable pawns, but they are all at the exact same location/stack on track.
    // Advancing anyway produces identical outcomes, so auto-move the first one to avoid tedious overlay selections.
    const firstPos = state.pawnPositions[playerIdx][movable[0]];
    const allAtSamePos = movable.every(idx => state.pawnPositions[playerIdx][idx] === firstPos);
    if (allAtSamePos) {
        return movable[0];
    }

    return null;
}

function applyPostRollMovement(playerIdx, roll) {
    // Quick Play: If a player rolls a 6, bring ALL UFOs out of base automatically
    if (state.gameConfig && state.gameConfig.mode === 'quick' && roll === 6) {
        const pawnsInBase = state.pawnPositions[playerIdx].reduce((acc, pos, idx) => {
            if (pos === -1) acc.push(idx);
            return acc;
        }, []);
        
        if (pawnsInBase.length > 0) {
            raiseToast(`⚡ QUICK LAUNCH! ${pawnsInBase.length} UFO${pawnsInBase.length > 1 ? 's' : ''} deployed from home base!`, '🛸');
            state.autoMovePending = true;
            
            setTimeout(() => {
                state.autoMovePending = false;
                if (state.activePlayer === playerIdx && state.hasRolled && state.lastRoll === roll) {
                    pawnsInBase.forEach(idx => {
                        state.pawnPositions[playerIdx][idx] = 0;
                    });
                    if (typeof renderPawns === 'function') renderPawns();
                    
                    // The first deployed pawn handles capture check at Start Cell, then grants extra turn for the 6.
                    finishTurnPawnLanding(playerIdx, pawnsInBase[0], 0);
                }
            }, 450);
            return true;
        }
    }

    const autoPawnIdx = resolveAutoMovePawn(playerIdx, roll);

    if (autoPawnIdx !== null) {
        const trackPawns = getActiveTrackPawns(playerIdx);
        let reason = 'Solo starship auto-pilot';
        if (trackPawns.length === 2) {
            reason = `Roll ${roll} — corridor starship moves (finish lane needs ≤2)`;
        }
        raiseToast(reason, '🛸');

        // Set auto-move pending flag to block any touch/click on pawns during the delay
        state.autoMovePending = true;

        setTimeout(() => {
            state.autoMovePending = false;
            if (
                state.activePlayer === playerIdx &&
                state.hasRolled &&
                state.lastRoll === roll &&
                !state.isAnimating &&
                !state.activeWarpSelect &&
                state.activeAlienSelect === -1 &&
                !state.activePowerUpTarget
            ) {
                executePawnMoveAnimation(playerIdx, autoPawnIdx, roll);
            }
        }, 450);
        return true;
    }

    syncSelectableGlows();
    return false;
}

// Injection of Trail and Undo styles
if (typeof document !== 'undefined') {
    if (!document.getElementById('pawn-trail-styles')) {
        const style = document.createElement('style');
        style.id = 'pawn-trail-styles';
        style.innerHTML = `
            @keyframes fadeTrailGreen {
                0% { box-shadow: inset 0 0 15px 3px var(--green, #00ff66); background: rgba(0, 255, 102, 0.25); filter: brightness(1.3); }
                100% { box-shadow: none; background: transparent; filter: none; }
            }
            @keyframes fadeTrailYellow {
                0% { box-shadow: inset 0 0 15px 3px var(--yellow, #ffcc00); background: rgba(255, 204, 0, 0.25); filter: brightness(1.3); }
                100% { box-shadow: none; background: transparent; filter: none; }
            }
            @keyframes fadeTrailRed {
                0% { box-shadow: inset 0 0 15px 3px var(--red, #ff3366); background: rgba(255, 51, 102, 0.25); filter: brightness(1.3); }
                100% { box-shadow: none; background: transparent; filter: none; }
            }
            @keyframes fadeTrailBlue {
                0% { box-shadow: inset 0 0 15px 3px var(--blue, #3399ff); background: rgba(51, 153, 255, 0.25); filter: brightness(1.3); }
                100% { box-shadow: none; background: transparent; filter: none; }
            }
            .pawn-ghost-trail-green { animation: fadeTrailGreen 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards !important; }
            .pawn-ghost-trail-yellow { animation: fadeTrailYellow 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards !important; }
            .pawn-ghost-trail-red { animation: fadeTrailRed 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards !important; }
            .pawn-ghost-trail-blue { animation: fadeTrailBlue 1.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards !important; }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('pawn-undo-styles')) {
        const style = document.createElement('style');
        style.id = 'pawn-undo-styles';
        style.innerHTML = `
            @keyframes undoBarShrink {
                0% { width: 100%; }
                100% { width: 0%; }
            }
            .undo-floating-banner {
                position: fixed;
                bottom: 85px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(13, 27, 62, 0.95);
                border: 2px solid var(--cyan, #00e5ff);
                box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
                border-radius: 12px;
                padding: 8px 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                z-index: 9999;
                font-family: 'Orbitron', sans-serif;
                transition: all 0.3s ease;
            }
            .undo-btn-inner {
                background: linear-gradient(135deg, #00e5ff, #0088cc);
                border: none;
                border-radius: 8px;
                color: #0d1b3e;
                font-weight: 900;
                padding: 6px 14px;
                font-size: 0.75rem;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
                transition: transform 0.1s ease;
            }
            .undo-btn-inner:active {
                transform: scale(0.95);
            }
            .undo-timer-bar {
                width: 100%;
                height: 4px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
                overflow: hidden;
            }
            .undo-timer-fill {
                height: 100%;
                background: var(--cyan, #00e5ff);
                animation: undoBarShrink 2s linear forwards;
            }
        `;
        document.head.appendChild(style);
    }
}

// Removed Undo feature to dramatically improve game pacing and remove artificial dead time.

function highlightTrailCells(coords, playerIdx) {
    if (typeof document === 'undefined' || !coords || !coords.length) return;
    const playerColor = players[playerIdx]?.color || 'green';
    const className = "pawn-ghost-trail-$playerColor";
    
    coords.forEach(coord => {
        const cell = document.getElementById("cell-$(coord[0])-$(coord[1])");
        if (cell) {
            cell.classList.remove('pawn-ghost-trail-green', 'pawn-ghost-trail-yellow', 'pawn-ghost-trail-red', 'pawn-ghost-trail-blue');
            cell.offsetHeight; // force reflow
            cell.classList.add(className);
            
            setTimeout(() => {
                cell.classList.remove(className);
            }, 2000);
        }
    });
}

// Check safe coordinates
function isCellSafe(playerIdx, pos) {
    const coord = pathMaps[playerIdx][pos];
    if (!coord) return false;
    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    const safeList = isMini ? miniSafeCoordinates : safeCoordinates;
    return safeList.some(c => c[0] === coord[0] && c[1] === coord[1]) ||
           (state.temporarySafeZones && state.temporarySafeZones.some(tz => tz.r === coord[0] && tz.c === coord[1]));
}

// Helpr function check pawn burning status
function isPawnBurning(pIdx, pPawnIdx) {
    if (!state.burningPawns) return false;
    return (state.burningPawns[pIdx]?.[pPawnIdx] > 0);
}

// Helpers for the landing execution loop to satisfy SRP (Single Responsibility Principle)
function checkFinish(playerIdx, finalPosition) {
    const finishPos = getFinishPos();
    if (finalPosition !== finishPos) {
        return { isFinish: false, grantExtraTurn: false, gameEndedState: false };
    }
    
    raiseToast(`${players[playerIdx].name}'s starship successfully docked at the Mother Ship! 🏆`, "🏆");
    playSynthSound(700, 1800, 0.8, 'sine');
    triggerBoardShake('heavy');

    const completions = state.pawnPositions[playerIdx].filter(p => p === finishPos).length;

    if (completions === state.pawnPositions[playerIdx].length) {
        if (!state.rankings) {
            state.rankings = [];
        }
        if (!state.rankings.includes(playerIdx)) {
            state.rankings.push(playerIdx);
            const rankLabels = ["1st PLACE (WINNER) 🏆", "2nd PLACE 🥈", "3rd PLACE 🥉", "4th PLACE (LOST) 💀"];
            const rankIndex = state.rankings.length - 1;
            raiseToast(`${players[playerIdx].name} secured the ${rankLabels[rankIndex] || (rankIndex + 1) + 'th Place'}!`, "👑");
            playSynthSound(500, 1500, 1.2, 'sine');

            if (state.rankings.length === 1) {
                if (typeof triggerEmojiReaction === 'function') {
                    if (isHuman(playerIdx)) {
                        triggerEmojiReaction('win_game', playerIdx);
                    } else {
                        triggerEmojiReaction('lose_game', playerIdx);
                    }
                }
            }
        }

        const slots = getActivePlayerSlots();
        const unfinished = slots.filter(i => !state.rankings.includes(i));
        if (unfinished.length === 1) {
            const lastIdx = unfinished[0];
            state.rankings.push(lastIdx);
            const rankLabels = ["1st PLACE (WINNER) 🏆", "2nd PLACE 🥈", "3rd PLACE 🥉", "4th PLACE (LOST) 💀"];
            const rankIndex = state.rankings.length - 1;
            raiseToast(`${players[lastIdx].name} finished in the ${rankLabels[rankIndex] || (rankIndex + 1) + 'th Place'}!`, "💀");
        }

        recalculateWinPercentages(); // Ensure WR display is updated immediately to show ranks beside WR

        if (state.rankings.length >= slots.length) {
            triggerWinnerScreen(playerIdx);
            return { isFinish: true, grantExtraTurn: false, gameEndedState: true };
        }
        return { isFinish: true, grantExtraTurn: false, gameEndedState: false }; // Finished but others still playing (passTurn called at caller)
    }
    
    return { isFinish: true, grantExtraTurn: true, gameEndedState: false };
}

function resolveCaptures(playerIdx, pawnIdx, finalPosition, coord) {
    let captureOccurred = false;
    let updatedFinalPosition = finalPosition;
    const isSafe = isCellSafe(playerIdx, finalPosition);
    const landingIsBurning = isPawnBurning(playerIdx, pawnIdx);

    for (let pIdx = 0; pIdx < 4; pIdx++) {
        if (pIdx === playerIdx || !isPlayerInGame(pIdx)) continue;
        state.pawnPositions[pIdx].forEach((enemyPos, eIdx) => {
            if (enemyPos >= 0 && enemyPos < getHomeStartPos()) {
                const enemyCoord = pathMaps[pIdx][enemyPos];
                if (enemyCoord[0] === coord[0] && enemyCoord[1] === coord[1]) {
                    // Touch occurred!
                    // Safe Stack (Blockade) Logic: if the enemy has 2 or more pawns on this cell, they cannot be captured.
                    const sameCellEnemyPawns = state.pawnPositions[pIdx].filter(pos => {
                        if (pos < 0 || pos >= getHomeStartPos()) return false;
                        const posCoord = pathMaps[pIdx][pos];
                        return posCoord && posCoord[0] === enemyCoord[0] && posCoord[1] === enemyCoord[1];
                    });
                    const isSafeStack = sameCellEnemyPawns.length >= 2;

                    const enemyIsBurning = isPawnBurning(pIdx, eIdx);
                    const canCapture = (!isSafe && !isSafeStack) || landingIsBurning || enemyIsBurning;

                    if (canCapture) {
                        let capturedPlayerIdx = -1;
                        if (landingIsBurning && !enemyIsBurning) {
                            // Burning landing pawn captures enemy pawn
                            if (state.shieldedPawns && state.shieldedPawns[pIdx][eIdx] > 0) {
                                state.shieldedPawns[pIdx][eIdx] = 0; // consume shield
                                playSynthSound(800, 400, 0.45, 'sine');
                                raiseToast(`🛡️ Deflected! ${players[pIdx].name}'s shield absorbed the fire attack!`, "🛡️");
                            } else {
                                state.pawnPositions[pIdx][eIdx] = -1;
                                state.canDeployAliens[pIdx] = true;
                                captureOccurred = true;
                                if (typeof triggerEmojiReaction === 'function') {
                                    triggerEmojiReaction('pawn_captured', pIdx, coord[0], coord[1]);
                                    triggerEmojiReaction('capture_opponent', playerIdx, coord[0], coord[1]);
                                }
                                const capturedPawnDOM = document.getElementById(`pawn-${pIdx}-${eIdx}`);
                                if (capturedPawnDOM) capturedPawnDOM.classList.add('pawn-exploding');
                                state.captures[playerIdx]++;
                                state.timesCaptured[pIdx]++;
                                capturedPlayerIdx = pIdx;
                            }
                        } else if (enemyIsBurning && !landingIsBurning) {
                            // Enemy burning pawn captures landing pawn
                            if (state.shieldedPawns && state.shieldedPawns[playerIdx][pawnIdx] > 0) {
                                state.shieldedPawns[playerIdx][pawnIdx] = 0; // consume shield
                                playSynthSound(800, 400, 0.45, 'sine');
                                raiseToast(`🛡️ Deflected! ${players[playerIdx].name}'s shield absorbed the fire contact!`, "🛡️");
                            } else {
                                state.pawnPositions[playerIdx][pawnIdx] = -1;
                                state.canDeployAliens[playerIdx] = true;
                                captureOccurred = true;
                                if (typeof triggerEmojiReaction === 'function') {
                                    triggerEmojiReaction('pawn_captured', playerIdx, coord[0], coord[1]);
                                    triggerEmojiReaction('capture_opponent', pIdx, coord[0], coord[1]);
                                }
                                const capturedPawnDOM = document.getElementById(`pawn-${pIdx}-${eIdx}`);
                                if (capturedPawnDOM) capturedPawnDOM.classList.add('pawn-exploding');
                                state.captures[pIdx]++;
                                state.timesCaptured[playerIdx]++;
                                capturedPlayerIdx = playerIdx;
                                updatedFinalPosition = -1; // sent back home base
                                const capturedPawnDOM2 = document.getElementById(`pawn-${playerIdx}-${pawnIdx}`);
                                if (capturedPawnDOM2) capturedPawnDOM2.classList.add('pawn-exploding');
                            }
                        } else if (!landingIsBurning && !enemyIsBurning && !isSafe && !isSafeStack) {
                            // Standard capture
                            if (state.shieldedPawns && state.shieldedPawns[pIdx][eIdx] > 0) {
                                state.shieldedPawns[pIdx][eIdx] = 0; // consume shield
                                playSynthSound(800, 400, 0.45, 'sine');
                                raiseToast(`🛡️ Deflected! ${players[pIdx].name}'s shield absorbed the attack!`, "🛡️");
                            } else {
                                state.pawnPositions[pIdx][eIdx] = -1;
                                state.canDeployAliens[pIdx] = true;
                                captureOccurred = true;
                                if (typeof triggerEmojiReaction === 'function') {
                                    triggerEmojiReaction('pawn_captured', pIdx, coord[0], coord[1]);
                                    triggerEmojiReaction('capture_opponent', playerIdx, coord[0], coord[1]);
                                }
                                const capturedPawnDOM = document.getElementById(`pawn-${pIdx}-${eIdx}`);
                                if (capturedPawnDOM) capturedPawnDOM.classList.add('pawn-exploding');
                                state.captures[playerIdx]++;
                                state.timesCaptured[pIdx]++;
                                capturedPlayerIdx = pIdx;
                            }
                        }
                        
                        // Check Warp Core Comeback Mechanic (Unlock if captured 3 times)
                        if (capturedPlayerIdx !== -1) {
                            if (state.timesCaptured[capturedPlayerIdx] >= 3 && !state.warpUnlocked[capturedPlayerIdx] && !state.warpUsed[capturedPlayerIdx]) {
                                state.warpUnlocked[capturedPlayerIdx] = true;
                                setTimeout(() => {
                                    raiseToast(`⚠️ CRITICAL DAMAGE DETECTED! ${players[capturedPlayerIdx].name} unlocked emergency ⚡ WARP CORE!`, "⚡");
                                    playSynthSound(900, 2000, 0.8, 'triangle');
                                }, 800);
                            }
                        }
                    }
                }
            }
        });
    }

    return { captureOccurred, updatedFinalPosition };
}

function checkPowerCellLanding(playerIdx, pawnIdx, finalPosition) {
    const finalCoord = pathMaps[playerIdx][finalPosition];
    if (finalCoord) {
        const hasHitPowerCell = !!powerCellAt(finalCoord[0], finalCoord[1]);
        if (hasHitPowerCell) {
            hitPowerCellAndRelocate(finalCoord[0], finalCoord[1], playerIdx, pawnIdx);
            return true;
        }
    }
    return false;
}

function handleExtraTurnOrPass(playerIdx, finalPosition, grantExtraTurn, isPowerUp = false) {
    const finishPos = getFinishPos();
    const completions = state.pawnPositions[playerIdx].filter(p => p === finishPos).length;
    const isFinished = (completions === state.pawnPositions[playerIdx].length);

    const extraTurnGranted = isPowerUp ? grantExtraTurn : (state.lastRoll === 6 || grantExtraTurn);

    if (!isFinished && extraTurnGranted) {
        if (!isPowerUp && state.lastRoll === 6) {
            raiseToast("Hyper-leap roll 6 bonus turn! Ready to ROLL again.", "🌌");
        } else if (finalPosition === finishPos) {
            raiseToast("UFO Finished bonus turn! Ready to ROLL again.", "🏆");
        } else {
            raiseToast("Opponent captured bonus turn! Ready to ROLL again.", "💥");
        }
        state.hasRolled = false;
        renderPawns();
        updateTurnUIVisually();
        if (isBot(playerIdx)) {
            scheduleBotTurn(800);
        }
    } else {
        passTurn();
    }
}

// Step-by-Step animators
function executePawnMoveAnimation(playerIdx, pawnIdx, stepsToTake, isNetworkAction = false) {
    if (state.isAnimating) return;
    
    if (state.isMultiplayer && window.Multiplayer && !isNetworkAction && !isBot(playerIdx)) {
        window.Multiplayer.broadcastAction('MOVE_PAWN', { playerIdx, pawnIdx, steps: stepsToTake });
    }
    
    // State preparation for animation
    state.isAnimating = true;

    // Support the Double Move (Hyper Expand) power-up
    if (state.doubleMoveActive && playerIdx === state.activePlayer) {
        state.doubleMoveActive = false;
        stepsToTake = stepsToTake * 2;
        raiseToast("⏩ ENGINE OVERDRIVE! Double Movement step implemented!", "⏩");
        playSynthSound(700, 1500, 0.45, 'triangle');
        
        const diceContainer = document.getElementById(`player-dice-container-${state.activePlayer}`);
        if (diceContainer) {
            diceContainer.classList.remove('active-roll-glowing');
        }
    }

    state.isAnimating = true;

    const originalPos = state.pawnPositions[playerIdx][pawnIdx];
    let currentStep = originalPos;
    const targetPos = originalPos === -1 ? 0 : originalPos + stepsToTake;

    const isDoubleStartLaunch = (originalPos === -1 && stepsToTake === 6);
    const trailCoords = [];

    function proceedStep() {
        if (currentStep === -1) {
            currentStep = 0;
        } else {
            currentStep++;
        }

        state.pawnPositions[playerIdx][pawnIdx] = currentStep;
        renderPawns();

        // Record visual trails along movement
        const coord = pathMaps[playerIdx][currentStep];
        if (coord) {
            trailCoords.push(coord);
            if (trailCoords.length > 3) {
                trailCoords.shift();
            }
        }

        // Play classic sci-fi pew move sound
        playPewSound();

        // Toggle engine jet trail class
        const pawnDOM = document.getElementById(`pawn-${playerIdx}-${pawnIdx}`);
        if (pawnDOM) pawnDOM.classList.add('moving');

        const finishPos = getFinishPos();
        if (currentStep < targetPos && currentStep < finishPos) {
            const isFastForward = (window.spaceLudoFastForwardBots === true) && isBot(playerIdx);
            const animSpeed = isFastForward ? 30 : (stepsToTake > 3 ? 90 : 200);
            setTimeout(proceedStep, animSpeed);
        } else {
            // Movement finishes stationary
            if (pawnDOM) pawnDOM.classList.remove('moving');
            highlightTrailCells(trailCoords, playerIdx);
            finishTurnPawnLanding(playerIdx, pawnIdx, targetPos);
        }
    }

    if (isDoubleStartLaunch) {
        // Instantly exit base to 0
        state.pawnPositions[playerIdx][pawnIdx] = 0;
        renderPawns();
        playPewSound();
        const coord = pathMaps[playerIdx][0];
        if (coord) {
            highlightTrailCells([coord], playerIdx);
        }
        finishTurnPawnLanding(playerIdx, pawnIdx, 0);
    } else {
        proceedStep();
    }
}

// Land handling finished
function finishTurnPawnLanding(playerIdx, pawnIdx, finalPosition, isPowerUp = false) {
    state.isAnimating = false;
    let grantExtraTurn = false;

    const finishResult = checkFinish(playerIdx, finalPosition);
    if (finishResult.isFinish) {
        if (finishResult.gameEndedState) {
            // Game is completely over — do NOT schedule any further turn logic
            return;
        }
        grantExtraTurn = finishResult.grantExtraTurn;
    } else {
        // Capture standard and custom powerups verify
        const coord = pathMaps[playerIdx][finalPosition];
        if (coord) {
            const captureOutput = resolveCaptures(playerIdx, pawnIdx, finalPosition, coord);
            finalPosition = captureOutput.updatedFinalPosition;
            
            if (captureOutput.captureOccurred) {
                playExplodeSound();
                raiseToast(`💥 Attack of ${players[playerIdx].name}! Opponent starships vaporized back to base!`, "💥");
                triggerBoardShake('heavy');
                grantExtraTurn = true;
            } else {
                triggerBoardShake('light');
                if (typeof isCellSafe === 'function' && isCellSafe(playerIdx, finalPosition)) {
                    if (typeof triggerEmojiReaction === 'function') {
                        triggerEmojiReaction('safe_zone', playerIdx, coord[0], coord[1]);
                    }
                }
            }
        } else {
            triggerBoardShake('light');
        }
    }

    // Near Victory check
    if (typeof checkNearVictory === 'function' && checkNearVictory(playerIdx)) {
        if (!state.nearVictoryTriggered) {
            state.nearVictoryTriggered = [false, false, false, false];
        }
        if (!state.nearVictoryTriggered[playerIdx]) {
            state.nearVictoryTriggered[playerIdx] = true;
            const positions = state.pawnPositions[playerIdx];
            const finishPos = getFinishPos();
            const lastPawnIdx = positions.findIndex(pos => pos < finishPos);
            if (lastPawnIdx !== -1) {
                const lastPos = positions[lastPawnIdx];
                const lastCoord = pathMaps[playerIdx][lastPos];
                if (lastCoord && typeof triggerEmojiReaction === 'function') {
                    triggerEmojiReaction('near_victory', playerIdx, lastCoord[0], lastCoord[1]);
                }
            }
        }
    }

    // Check if landed exactly on an active custom Power Cell coordinate
    const wasHasRolled = state.hasRolled;
    checkPowerCellLanding(playerIdx, pawnIdx, finalPosition);

    // If a power-up (e.g. extra_roll) reset hasRolled, keep the turn active — do NOT pass turn
    if (wasHasRolled && !state.hasRolled) {
        renderPawns();
        if (isBot(playerIdx)) {
            scheduleBotTurn(800);
        }
        return;
    }

    // Guard: if game ended during power cell landing, stop here
    if (state.rankings && state.rankings.length >= getActivePlayerSlots().length) {
        return;
    }

    // Turn scheduling decision
    const scheduleNextAction = () => {
        // Final guard before executing — game may have ended during the delay
        if (state.rankings && state.rankings.length >= getActivePlayerSlots().length) return;
        handleExtraTurnOrPass(playerIdx, finalPosition, grantExtraTurn, isPowerUp);
    };

    // Snappy pacing: if human, very short 350ms delay for comprehension before turn ends
    if (!isBot(playerIdx)) {
        setTimeout(() => {
            scheduleNextAction();
        }, 350);
    } else {
        scheduleNextAction();
    }
}

// Pawns click controller
function handlePawnClick(playerIdx, pawnIdx) {
    if (state.isAnimating || !isPlayerInGame(playerIdx)) return;
    // Block touch if an auto-move is pending (prevents touch+auto stacking)
    if (state.autoMovePending) return;

    // Target selection intercept for active power-ups
    if (state.activePowerUpTarget && playerIdx === state.activePlayer) {
        gamePowerUpEngine.resolveTargetedPowerUp(pawnIdx);
        return;
    }

    // Warp teleportation selected target
    if (state.activeWarpSelect && playerIdx === state.activePlayer) {
        const pos = state.pawnPositions[playerIdx][pawnIdx];
        if (pos >= 0 && pos < 55) {
            executeWarpTeleport(playerIdx, pawnIdx);
        }
        return;
    }

    // Normal speed movement
    if (state.hasRolled && playerIdx === state.activePlayer && !state.activeWarpSelect && state.activeAlienSelect === -1) {
        const canMove = testCanMovePawn(playerIdx, pawnIdx, state.lastRoll);
        if (canMove) {
            executePawnMoveAnimation(playerIdx, pawnIdx, state.lastRoll);
        }
    }
}

// Activators warp power
function activateWarpDrive(playerIdx) {
    if (state.isAnimating || !isPlayerInGame(playerIdx) || playerIdx !== state.activePlayer || !state.warpUnlocked[playerIdx] || state.warpUsed[playerIdx] || !state.hasRolled) return;

    const hasPawnOnPath = state.pawnPositions[playerIdx].some(pos => pos >= 0 && pos < 55);
    if (!hasPawnOnPath) {
        raiseToast("No active UFOs on flight corridors to warp!", "⚠️");
        return;
    }

    state.activeWarpSelect = !state.activeWarpSelect;
    const btn = document.getElementById(`warp-${playerIdx}`);
    if (state.activeWarpSelect) {
        if (btn) btn.classList.add('active-warp');
        setButtonText(`warp-${playerIdx}`, "TAP PAWN", "🎯");
    } else {
        if (btn) btn.classList.remove('active-warp');
        setButtonText(`warp-${playerIdx}`, "⚡ WARP", "⚡");
    }
    syncSelectableGlows();
}

function executeWarpTeleport(playerIdx, pawnIdx) {
    state.warpUsed[playerIdx] = true;
    state.activeWarpSelect = false;

    state.pawnPositions[playerIdx][pawnIdx] = 55; // Teleport directly 1 step short of finish

    playTeleportSound();
    raiseToast(`⚡ ${players[playerIdx].name}'s starship initiated quantum wormhole directly to coordinates 55!`, "⚡");

    const btn = document.getElementById(`warp-${playerIdx}`);
    if (btn) {
        btn.classList.remove('active-warp', 'unlocked');
        btn.disabled = true;
    }
    setButtonText(`warp-${playerIdx}`, "⚡ USED", "⚡❌");

    renderPawns();
    
    // Fast turn progression
    const scheduleWarpNextAction = () => {
        passTurn();
    };

    if (!isBot(playerIdx)) {
        setTimeout(() => {
            scheduleWarpNextAction();
        }, 400);
    } else {
        scheduleWarpNextAction();
    }
}


// Activators alien system
function activateAlienDeployment(playerIdx, alienIdx) {
    if (state.isAnimating || playerIdx !== state.activePlayer || state.aliensUsed[playerIdx][alienIdx]) return;

    if (state.activeAlienSelect === alienIdx) {
        // Cancel
        state.activeAlienSelect = -1;
        const banner = document.getElementById('board-instruction-overlay');
        if (banner) banner.classList.remove('active');
        document.querySelectorAll('.cell').forEach(c => c.style.boxShadow = '');
    } else {
        state.activeAlienSelect = alienIdx;
        const overlay = document.getElementById('board-instruction-overlay');
        if (overlay) {
            overlay.innerText = "TAP FLIGHT CELL TO LAUNCH ALIEN 👾";
            overlay.classList.add('active');
        }

        // Highlight common track cells purple glows
        commonTrack.forEach(coord => {
            const cell = document.getElementById(`cell-${coord[0]}-${coord[1]}`);
            if (cell) cell.style.boxShadow = 'inset 0 0 8px 1px var(--purple)';
        });
    }
}

function handleCellClick(row, col) {
    // 1. If active power-up target is set, allow selecting pawn by clicking cell
    if (state.activePowerUpTarget && state.activeAlienSelect === -1) {
        const playerIdx = state.activePlayer;
        const pawns = state.pawnPositions[playerIdx];
        const finishPos = getFinishPos();
        const pawnIdx = pawns.findIndex(pos => {
            if (pos === -1 || pos === finishPos) return false;
            const coord = pathMaps[playerIdx][pos];
            return coord && coord[0] === row && coord[1] === col;
        });
        if (pawnIdx !== -1) {
            gamePowerUpEngine.resolveTargetedPowerUp(pawnIdx);
            return;
        }
    }

    // 2. If active warp select is set, allow selecting pawn by clicking cell
    if (state.activeWarpSelect && state.activeAlienSelect === -1) {
        const playerIdx = state.activePlayer;
        const pawns = state.pawnPositions[playerIdx];
        const finishPos = getFinishPos();
        const pawnIdx = pawns.findIndex(pos => {
            if (pos === -1 || pos === finishPos) return false;
            const coord = pathMaps[playerIdx][pos];
            return coord && coord[0] === row && coord[1] === col;
        });
        if (pawnIdx !== -1) {
            const pos = state.pawnPositions[playerIdx][pawnIdx];
            if (pos >= 0 && pos < finishPos) {
                executeWarpTeleport(playerIdx, pawnIdx);
                return;
            }
        }
    }

    if (state.activeAlienSelect === -1) return;

    // Check if cell is part of common track
    const trackIdx = commonTrack.findIndex(coord => coord[0] === row && coord[1] === col);
    if (trackIdx === -1) {
        raiseToast("Invalid launch corridors! Launch aliens on standard path channels only.", "⚠️");
        return;
    }

    const pIdx = state.activePlayer;
    const aIdx = state.activeAlienSelect;

    state.aliensUsed[pIdx][aIdx] = true;
    state.activeAlienSelect = -1;
    
    const banner = document.getElementById('board-instruction-overlay');
    if (banner) banner.classList.remove('active');
    document.querySelectorAll('.cell').forEach(c => c.style.boxShadow = '');

    // Record Alien placement
    state.aliensOnBoard.push({
        playerIdx: pIdx,
        alienIdx: aIdx,
        cellIdx: trackIdx,
        killsLeft: 1,
        id: `alien-token-${pIdx}-${aIdx}`
    });

    // Disable deployment button visually
    const btn = document.getElementById(`alien-${pIdx}-${aIdx}`);
    if (btn) {
        btn.classList.add('disabled-used');
        btn.disabled = true;
    }
    setButtonText(`alien-${pIdx}-${aIdx}`, "👾 OUT", "👾❌");

    playSynthSound(600, 200, 0.5, 'sawtooth');
    raiseToast(`👾 Alien deployed at coordinates [${row}, ${col}] by ${players[pIdx].name}!`, "👾");

    renderAliens();
    setTimeout(() => {
        testAlienSnatches();
    }, 300);
}

function renderAliens() {
    // Remove previous alien tokens from boards elements
    document.querySelectorAll('.alien').forEach(e => e.remove());

    state.aliensOnBoard.forEach(al => {
        const coord = commonTrack[al.cellIdx];
        const cell = document.getElementById(`cell-${coord[0]}-${coord[1]}`);
        if (cell) {
            const t = document.createElement('div');
            t.className = 'alien';
            t.id = al.id;
            t.innerText = '👾';
            cell.appendChild(t);
        }
    });
}

// Turn-based alien movement (called from passTurn in dice.js)
function tickAliensMovement() {
    if (state.aliensOnBoard.length === 0) return;

    state.aliensOnBoard.forEach((al) => {
        // Wander +/- 1 step along the track loop
        const dir = Math.random() > 0.5 ? 1 : -1;
        al.cellIdx = (al.cellIdx + dir + getCommonTrackLength()) % getCommonTrackLength();
    });

    renderAliens();
    testAlienSnatches();
}

// Check if roaming alien swallows pawn
function testAlienSnatches() {
    const activeAliens = [...state.aliensOnBoard];

    activeAliens.forEach((alien) => {
        const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
        const track = isMini ? miniCommonTrack : commonTrack;
        const coord = track[alien.cellIdx];

        // Star fields are completely immune to attacks and cannot be devoured!
        const safeList = isMini ? miniSafeCoordinates : safeCoordinates;
        const isSafeCell = safeList.some(c => c[0] === coord[0] && c[1] === coord[1]);
        if (isSafeCell) return;

        // Find candidate targets
        const victims = [];
        for (let pIdx = 0; pIdx < 4; pIdx++) {
            if (pIdx === alien.playerIdx || !isPlayerInGame(pIdx)) continue;
            const positions = state.pawnPositions[pIdx];
            positions.forEach((pos, pawnIdx) => {
                if (pos >= 0 && pos < getHomeStartPos()) { // On path
                    const pawnCoord = pathMaps[pIdx][pos];
                    if (pawnCoord[0] === coord[0] && pawnCoord[1] === coord[1]) {
                        // Check if the candidate has an active shield. If so, they are completely immune and ignored!
                        const hasShield = state.shieldedPawns && state.shieldedPawns[pIdx][pawnIdx] > 0;
                        if (!hasShield) {
                            victims.push({ pIdx, pawnIdx });
                        }
                    }
                }
            });
        }

        if (victims.length > 0) {
            // Select one random target to devour
            const target = victims[Math.floor(Math.random() * victims.length)];
            state.pawnPositions[target.pIdx][target.pawnIdx] = -1; // Send Home Base
            state.canDeployAliens[target.pIdx] = true; // Unlock alien deployment for captured player!

            // Increment alien kills and times captured stats
            state.alienKills[alien.playerIdx]++;
            state.timesCaptured[target.pIdx]++;

            playAlienSound();
            raiseToast(`👾 Warning! Alien devourer swallowed ${players[target.pIdx].name}'s starship at sector index [${coord[0]}, ${coord[1]}]!`, "👾");

            alien.killsLeft--;
            if (alien.killsLeft <= 0) {
                raiseToast(`👾 Alien devourer expended its energy and dissipated!`, "🌌");
                state.aliensOnBoard = state.aliensOnBoard.filter(al => al.id !== alien.id);
            }
        }
    });

    renderPawns();
    renderAliens();
}

function activateSingleAlienDeployment(playerIdx) {
    if (state.isAnimating || !isPlayerInGame(playerIdx) || playerIdx !== state.activePlayer) return;
    
    // Choose the first unused alien index
    let alienIdx = -1;
    if (!state.aliensUsed[playerIdx][0]) {
        alienIdx = 0;
    } else if (!state.aliensUsed[playerIdx][1]) {
        alienIdx = 1;
    }
    
    if (alienIdx === -1) {
        raiseToast("No more alien deployments remaining in deck lanes!", "⚠️");
        return;
    }
    
    activateAlienDeployment(playerIdx, alienIdx);
}


