// bots.js - Automated robot players decisions, path calculations, and difficulty engines

let botTurnTimer = null;

// Ensure styles for bot thinking indicator are injected
if (typeof document !== 'undefined' && !document.getElementById('bot-thinking-styles')) {
    const style = document.createElement('style');
    style.id = 'bot-thinking-styles';
    style.innerHTML = `
        @keyframes botIndicatorPulse {
            0% { opacity: 0.65; transform: scale(0.96); box-shadow: 0 0 6px rgba(0, 229, 255, 0.25); }
            100% { opacity: 1; transform: scale(1.02); box-shadow: 0 0 12px rgba(0, 229, 255, 0.6); }
        }
        .bot-thinking-indicator {
            animation: botIndicatorPulse 0.7s infinite alternate !important;
        }
    `;
    document.head.appendChild(style);
}

function showBotThinkingIndicator(playerIdx) {
    // Hidden per request
    return;
}

function removeBotThinkingIndicator(playerIdx) {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById(`panel-${playerIdx}`);
    if (!panel) return;
    const indicator = panel.querySelector('.bot-thinking-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function clearAllThinkingIndicators() {
    for (let i = 0; i < 4; i++) {
        removeBotThinkingIndicator(i);
    }
}

function botThinkDelay() {
    if (window.spaceLudoFastForwardBots) return 50; // Super fast when toggled
    const diff = state.gameConfig?.botDifficulty || 'medium';
    if (diff === 'easy') return 400 + Math.random() * 200;
    if (diff === 'hard') return 150 + Math.random() * 100;
    return 250 + Math.random() * 150;
}

function scheduleBotTurn(delay) {
    if (botTurnTimer) clearTimeout(botTurnTimer);
    if (!state.gameConfig?.gameStarted) return;
    
    // Guard: Prevent running if game is completed
    if (state.rankings && state.rankings.length >= getActivePlayerSlots().length) return;
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'game-screen') return;
    if (!isBot(state.activePlayer)) return;

    // Guard: if all in base and did not roll a 6, do NOT schedule a bot turn!
    const playerIdx = state.activePlayer;
    const allInBase = state.pawnPositions[playerIdx].every(pos => pos === -1);
    if (allInBase && state.hasRolled && state.lastRoll !== 6) {
        return;
    }

    // Display active thinking indicator on bot panel
    clearAllThinkingIndicators();
    showBotThinkingIndicator(state.activePlayer);

    // Occasional calculating toast to make turn feel alive and simulated
    // (Disabled to prevent continuous/annoying toast spams)
    /*
    if (Math.random() < 0.25) {
        const botName = (typeof players !== 'undefined' && players[state.activePlayer]) ? players[state.activePlayer].name : "Pilot AI";
        if (typeof raiseToast === 'function') {
            raiseToast(`${botName} is calculating optimal flight trajectories...`, "🤖");
        }
    }
    */

    const wait = typeof delay === 'number' ? delay : botThinkDelay();
    botTurnTimer = setTimeout(runBotTurn, wait);
}

function runBotTurn() {
    botTurnTimer = null;
    if (!state.gameConfig?.gameStarted) return;
    if (state.isAnimating) {
        scheduleBotTurn(300);
        return;
    }
    
    // Guard: Prevent actions after game ends
    if (state.rankings && state.rankings.length >= getActivePlayerSlots().length) return;
    if (typeof currentScreen !== 'undefined' && currentScreen !== 'game-screen') return;
    if (!isPlayerInGame(state.activePlayer) || !isBot(state.activePlayer)) return;

    // Guard: if all pawns in base and hasRolled and lastRoll is not 6, pass turn immediately
    const playerIdx = state.activePlayer;
    if (state.hasRolled) {
        const allInBase = state.pawnPositions[playerIdx].every(pos => pos === -1);
        if (allInBase) {
            if (state.lastRoll !== 6) {
                // Bot rolled but did not get a 6 — pass turn immediately, no retry
                setTimeout(() => passTurn(), 800);
                return;
            }
            // Bot rolled a 6 — launch the first available pawn from base
            const pawnIdx = state.pawnPositions[playerIdx].findIndex(pos => pos === -1);
            if (pawnIdx !== -1) {
                if (state.activePlayer === playerIdx && state.hasRolled && !state.isAnimating) {
                    executePawnMoveAnimation(playerIdx, pawnIdx, 6);
                }
            }
            return;
        }
    }

    // Clear indicator as bot is now acting
    clearAllThinkingIndicators();

    if (state.activePowerUpTarget) {
        const pawnIdx = chooseBotPawn(state.activePlayer, state.lastRoll);
        if (pawnIdx >= 0) {
            gamePowerUpEngine.resolveTargetedPowerUp(pawnIdx);
        }
        return;
    }

    if (state.activeWarpSelect) {
        const warpPawn = chooseBotWarpPawn(state.activePlayer);
        if (warpPawn >= 0) {
            executeWarpTeleport(state.activePlayer, warpPawn);
        } else {
            state.activeWarpSelect = false;
            updateTurnUIVisually();
            tryBotMoveOrRoll();
        }
        return;
    }

    if (!state.hasRolled) {
        // Try warp before rolling if available
        if (tryBotWarpIfReady(state.activePlayer)) return;
        // Try alien deployment before rolling
        tryBotDeployAlien(state.activePlayer);
        tryBotPreRollActions();
        rollPlayerDice(state.activePlayer);
        return;
    }

    tryBotMove();
}

function tryBotPreRollActions() {
    const playerIdx = state.activePlayer;
    const items = state.playerPowerups[playerIdx] || [];
    if (!items.length) return;

    // Easy difficulty bots randomly use or discard so that inventory doesn't fill up
    if (state.gameConfig?.botDifficulty === 'easy') {
        const isFull = items.length >= 3;
        const actionChance = isFull ? 0.7 : 0.25;
        if (Math.random() < actionChance) {
            const randomIndex = Math.floor(Math.random() * items.length);
            const botName = (typeof players !== 'undefined' && players[playerIdx]) ? players[playerIdx].name : "UFO Bot";
            
            // 50% chance to activate random item, 50% chance to discard
            if (Math.random() < 0.5) {
                if (gamePowerUpEngine && typeof gamePowerUpEngine.activatePowerUp === 'function') {
                    gamePowerUpEngine.activatePowerUp(playerIdx, randomIndex);
                }
            } else {
                const discardedKey = items[randomIndex];
                const config = gamePowerUpEngine?.registry?.[discardedKey];
                const displayName = config ? `${config.icon} ${config.name}` : discardedKey;
                items.splice(randomIndex, 1);
                
                if (typeof raiseToast === 'function') {
                    raiseToast(`${botName} discarded ${displayName} to optimize deck storage!`, "🗑️");
                }
                if (gamePowerUpEngine && typeof gamePowerUpEngine.renderInventory === 'function') {
                    gamePowerUpEngine.renderInventory();
                }
            }
        }
        return;
    }

    // Hard/Medium bots standard activate logic
    for (let slot = 0; slot < items.length; slot++) {
        const key = items[slot];
        const config = gamePowerUpEngine?.registry?.[key];
        if (!config || config.requiresTarget) continue;
        gamePowerUpEngine.activatePowerUp(playerIdx, slot);
        return;
    }
}

function tryBotMoveOrRoll() {
    if (!state.hasRolled) {
        scheduleBotTurn(400);
    } else {
        tryBotMove();
    }
}

function tryBotMove() {
    const playerIdx = state.activePlayer;
    const roll = state.lastRoll;

    // Check if ALL pawns are in base (position === -1)
    const allInBase = state.pawnPositions[playerIdx].every(pos => pos === -1);
    if (allInBase) {
        if (roll !== 6) {
            // Bot rolled but did not get a 6 — pass turn immediately, no retry
            setTimeout(() => passTurn(), 800);
            return;
        }
        // Bot rolled a 6 — launch the first available pawn from base
        const pawnIdx = state.pawnPositions[playerIdx].findIndex(pos => pos === -1);
        if (pawnIdx !== -1) {
            if (state.activePlayer === playerIdx && state.hasRolled && !state.isAnimating) {
                executePawnMoveAnimation(playerIdx, pawnIdx, 6);
            }
        }
        return;
    }

    const autoPawn = resolveAutoMovePawn(playerIdx, roll);
    if (autoPawn !== null) {
        setTimeout(() => {
            if (state.activePlayer === playerIdx && state.hasRolled && !state.isAnimating) {
                executePawnMoveAnimation(playerIdx, autoPawn, roll);
            }
        }, botThinkDelay() * 0.4);
        return;
    }

    const pawnIdx = chooseBotPawn(playerIdx, roll);

    if (pawnIdx >= 0) {
        setTimeout(() => {
            if (state.activePlayer === playerIdx && state.hasRolled && !state.isAnimating) {
                executePawnMoveAnimation(playerIdx, pawnIdx, state.lastRoll);
            }
        }, botThinkDelay() * 0.5);
    } else {
        setTimeout(() => passTurn(), 500);
    }
}

function chooseBotWarpPawn(playerIdx) {
    let best = -1;
    let bestPos = -1;
    const finishPos = getFinishPos();
    state.pawnPositions[playerIdx].forEach((pos, idx) => {
        if (pos >= 0 && pos < finishPos - 1 && pos > bestPos) {
            bestPos = pos;
            best = idx;
        }
    });
    return best;
}

function scoreBotMove(playerIdx, pawnIdx, roll) {
    const pos = state.pawnPositions[playerIdx][pawnIdx];
    const target = pos === -1 ? 0 : pos + roll;
    const finishPos = getFinishPos();
    const homeStart = getHomeStartPos();
    let score = target;

    if (target === finishPos) score += 200;
    if (pos === -1 && roll === 6) score += 80;

    const targetCoord = pathMaps[playerIdx][target];
    if (targetCoord && target < homeStart) {
        // Safe cell strategic check
        const isSafe = safeCoordinates.some(c => c[0] === targetCoord[0] && c[1] === targetCoord[1]);
        const isTemporarySafe = state.temporarySafeZones && state.temporarySafeZones.some(tz => tz.r === targetCoord[0] && tz.c === targetCoord[1]);
        const isSafeCell = isSafe || isTemporarySafe;

        if (isSafeCell) {
            score += 65; // Value safe zones strategically! Yes, safety is high priority.
        } else {
            // Only check captures if target cell is not safe
            getActivePlayerSlots().forEach(pIdx => {
                if (pIdx === playerIdx) return;
                state.pawnPositions[pIdx].forEach((enemyPos, eIdx) => {
                    if (enemyPos >= 0 && enemyPos < homeStart) {
                        const ec = pathMaps[pIdx][enemyPos];
                        if (ec[0] === targetCoord[0] && ec[1] === targetCoord[1]) {
                            score += 120; // High value capture reward
                        }
                    }
                });
            });
        }
    }

    if (target > pos) score += target * 0.5;
    return score;
}

function chooseBotPawn(playerIdx, roll) {
    const candidates = [];
    const count = state.pawnPositions[playerIdx] ? state.pawnPositions[playerIdx].length : 4;
    for (let i = 0; i < count; i++) {
        if (testCanMovePawn(playerIdx, i, roll)) {
            candidates.push({ pawnIdx: i, score: scoreBotMove(playerIdx, i, roll) });
        }
    }
    if (!candidates.length) return -1;

    candidates.sort((a, b) => b.score - a.score);
    const diff = state.gameConfig?.botDifficulty || 'medium';

    if (diff === 'easy') {
        const pool = candidates.slice(0, Math.min(3, candidates.length));
        return pool[Math.floor(Math.random() * pool.length)].pawnIdx;
    }
    
    if (diff === 'medium') {
        // Play consistently but conservatively. No "bluffing".
        if (Math.random() < 0.75) return candidates[0].pawnIdx;
        return candidates[Math.min(1, candidates.length - 1)].pawnIdx;
    }
    
    if (diff === 'hard') {
        return candidates[0].pawnIdx;
    }
    
    if (Math.random() < 0.75) return candidates[0].pawnIdx;
    return candidates[Math.min(1, candidates.length - 1)].pawnIdx;
}

function tryBotWarpIfReady(playerIdx) {
    const isMini = (state.gameConfig && state.gameConfig.mode === 'miniLudo');
    const isQuick = (state.gameConfig && state.gameConfig.mode === 'quick');
    if (isMini || isQuick) return false;

    if (
        state.gameConfig?.botDifficulty === 'easy' ||
        !state.warpUnlocked[playerIdx] ||
        state.warpUsed[playerIdx]
    ) {
        return false;
    }

    const warpPawn = chooseBotWarpPawn(playerIdx);
    if (warpPawn >= 0 && state.pawnPositions[playerIdx][warpPawn] >= 0 && state.pawnPositions[playerIdx][warpPawn] < 45) {
        state.activeWarpSelect = true;
        executeWarpTeleport(playerIdx, warpPawn);
        return true;
    }
    return false;
}

/**
 * Bot alien deployment: picks the best available alien slot and places it
 * on the common track cell closest to an enemy pawn (or random if none found).
 * Easy bots deploy randomly; medium/hard bots aim near enemies.
 */
function tryBotDeployAlien(playerIdx) {
    const isMini = (state.gameConfig && state.gameConfig.mode === 'miniLudo');
    const isQuick = (state.gameConfig && state.gameConfig.mode === 'quick');
    if (isMini || isQuick) return;

    if (!state.canDeployAliens || !state.canDeployAliens[playerIdx]) return;
    if (!state.aliensUsed || !state.aliensUsed[playerIdx]) return;

    // Find the first unused alien slot
    const alienIdx = state.aliensUsed[playerIdx].findIndex(used => !used);
    if (alienIdx === -1) return; // No aliens left to deploy

    // Pick a target cell on the common track
    let targetTrackIdx = -1;
    const diff = state.gameConfig?.botDifficulty || 'medium';

    if (diff !== 'easy') {
        // Find a common track cell that an enemy pawn currently occupies
        let bestThreat = -1;
        const homeStart = getHomeStartPos();
        for (let pIdx = 0; pIdx < 4; pIdx++) {
            if (pIdx === playerIdx || !isPlayerInGame(pIdx)) continue;
            state.pawnPositions[pIdx].forEach(pos => {
                if (pos < 0 || pos >= homeStart) return;
                const enemyCoord = pathMaps[pIdx][pos];
                const tIdx = commonTrack.findIndex(c => c[0] === enemyCoord[0] && c[1] === enemyCoord[1]);
                if (tIdx !== -1) {
                    // Prefer cells with enemies further along the track (higher pos = more threat)
                    if (pos > bestThreat) {
                        bestThreat = pos;
                        targetTrackIdx = tIdx;
                    }
                }
            });
        }
    }

    // Fallback: pick a random common track cell (skip safe zones)
    if (targetTrackIdx === -1) {
        const candidates = commonTrack
            .map((coord, idx) => ({ coord, idx }))
            .filter(({ coord }) => !safeCoordinates.some(s => s[0] === coord[0] && s[1] === coord[1]));
        if (candidates.length === 0) return;
        targetTrackIdx = candidates[Math.floor(Math.random() * candidates.length)].idx;
    }

    // Deploy the alien directly (mirrors handleCellClick alien placement logic)
    state.aliensUsed[playerIdx][alienIdx] = true;
    state.canDeployAliens[playerIdx] = false;
    state.activeAlienSelect = -1;

    state.aliensOnBoard.push({
        playerIdx,
        alienIdx,
        cellIdx: targetTrackIdx,
        killsLeft: 1,
        id: `alien-token-${playerIdx}-${alienIdx}`
    });

    // Update button UI
    const btn = document.getElementById(`alien-${playerIdx}-${alienIdx}`);
    if (btn) {
        btn.classList.add('disabled-used');
        btn.disabled = true;
    }
    if (typeof setButtonText === 'function') {
        setButtonText(`alien-${playerIdx}-${alienIdx}`, "👾 OUT", "👾❌");
    }

    const coord = commonTrack[targetTrackIdx];
    const botName = (typeof players !== 'undefined' && players[playerIdx]) ? players[playerIdx].name : "Bot";
    playSynthSound(600, 200, 0.5, 'sawtooth');
    raiseToast(`👾 ${botName} deployed an alien at sector [${coord[0]}, ${coord[1]}]!`, "👾");

    if (typeof renderAliens === 'function') renderAliens();
    setTimeout(() => {
        if (typeof testAlienSnatches === 'function') testAlienSnatches();
    }, 300);
}
