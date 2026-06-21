/**
 * SPACE LUDO — ADVANCED POWER-UP SYSTEM
 * A highly decoupled, event-driven architecture that manages strategic power-up acquisitions,
 * slots inventory, interactive clicks, physics hooks, and custom visual layers.
 */

// Injection of Powerup Slot Custom Colors and Tooltip styles
if (typeof document !== 'undefined') {
    if (!document.getElementById('powerup-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'powerup-custom-styles';
        style.innerHTML = `
            .powerup-slot.powerup-slot-colored {
                border-color: var(--slot-color) !important;
                border-style: solid !important;
                box-shadow: 0 0 6px var(--slot-color-glow) !important;
                position: relative;
            }
            .powerup-tooltip {
                position: absolute;
                bottom: calc(100% + 10px);
                left: 50%;
                transform: translateX(-50%) translateY(5px);
                background: rgba(4, 10, 31, 0.98);
                border: 1px solid var(--slot-color, #00e5ff);
                box-shadow: 0 0 12px var(--slot-color-glow, rgba(0, 229, 255, 0.3));
                color: #ffffff;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 0.65rem;
                font-family: 'Orbitron', 'Space Grotesk', sans-serif;
                width: 140px;
                text-align: center;
                pointer-events: none;
                opacity: 0;
                visibility: hidden;
                transition: all 0.2s ease-in-out;
                z-index: 12000;
            }
            .powerup-tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border-width: 5px;
                border-style: solid;
                border-color: rgba(4, 10, 31, 0.98) transparent transparent transparent;
            }
            .powerup-slot-colored:hover .powerup-tooltip,
            .powerup-slot-colored.show-tooltip .powerup-tooltip {
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateX(-50%) translateY(0) !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Extend base state parameters if they don't exist
if (!state.playerPowerups) {
    state.playerPowerups = [[], [], [], []];
}
if (!state.shieldedPawns) {
    const ufoCount = (state.pawnPositions && state.pawnPositions[0]) ? state.pawnPositions[0].length : 2;
    state.shieldedPawns = [
        Array(ufoCount).fill(0),
        Array(ufoCount).fill(0),
        Array(ufoCount).fill(0),
        Array(ufoCount).fill(0)
    ];
}
if (!state.frozenTurns) {
    state.frozenTurns = [0, 0, 0, 0];
}
if (!state.temporarySafeZones) {
    state.temporarySafeZones = []; // { r, c, turnsLeft }
}
if (!state.doubleMoveActive) {
    state.doubleMoveActive = false;
}
if (!state.activePowerUpTarget) {
    state.activePowerUpTarget = null; // { name, slotIdx }
}
function initializeRandomPortals() {
    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    if (isMini) {
        state.powerCells = [];
        return;
    }
    const isClash = (typeof window !== 'undefined' && window.isClashMode) === true;
    const targetCount = isClash ? 12 : 4;
    const distLimit = isClash ? 0 : 1;

    const candidateTrack = commonTrack.filter(coord => {
        // exclude star/safe cells
        return !safeCoordinates.some(sc => sc[0] === coord[0] && sc[1] === coord[1]);
    });

    const portals = [];
    const tempCandidates = [...candidateTrack];

    // Shuffle tempCandidates in place
    for (let i = tempCandidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tempCandidates[i], tempCandidates[j]] = [tempCandidates[j], tempCandidates[i]];
    }

    const powerTypes = ['shield_token', 'freeze_opponent', 'teleport_jump', 'rocket_boost', 'lightning_fire', 'extra_roll'];

    for (const candidate of tempCandidates) {
        if (portals.length >= targetCount) break;

        const r1 = candidate[0];
        const c1 = candidate[1];
        // Check if too close physically to any chosen portal
        const tooClose = portals.some(p => {
            const pcc = powerCellCoord(p);
            return pcc && Math.abs(r1 - pcc[0]) <= distLimit && Math.abs(c1 - pcc[1]) <= distLimit;
        });

        if (!tooClose) {
            const randomType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
            portals.push({
                r: r1,
                c: c1,
                type: randomType
            });
        }
    }

    // Safety fallback
    if (portals.length < targetCount) {
        portals.length = 0;
        while (portals.length < targetCount) {
            const pick = candidateTrack[Math.floor(Math.random() * candidateTrack.length)];
            if (!portals.some(p => {
                const pcc = powerCellCoord(p);
                return pcc && pcc[0] === pick[0] && pcc[1] === pick[1];
            })) {
                const randomType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                portals.push({
                    r: pick[0],
                    c: pick[1],
                    type: randomType
                });
            }
        }
    }

    state.powerCells = portals;
}

const initialTargetCount = (typeof window !== 'undefined' && window.isClashMode) === true ? 12 : 4;
if (!state.powerCells || state.powerCells.length < initialTargetCount) {
    initializeRandomPortals();
}

function triggerPortalAnimation(playerIdx, pawnIdx) {
    const el = document.getElementById(`pawn-${playerIdx}-${pawnIdx}`);
    if (el) {
        el.classList.add('portal-animating');
        setTimeout(() => el.classList.remove('portal-animating'), 750);
    }
}

function triggerRocketAnimation(playerIdx, pawnIdx) {
    const el = document.getElementById(`pawn-${playerIdx}-${pawnIdx}`);
    if (el) {
        el.classList.add('rocket-animating');
        setTimeout(() => el.classList.remove('rocket-animating'), 750);
    }
}

const POWERUP_ICON_SRCS = {
    'shield_token': 'images/generated/icons/icon_shield_powerup.png',
    'freeze_opponent': 'images/generated/icons/icon_freeze_powerup.png',
    'teleport_jump': 'images/generated/icons/icon_wormhole_powerup.png',
    'rocket_boost': 'images/generated/icons/icon_rocket_powerup.png',
    'lightning_fire': 'images/generated/icons/icon_fire_powerup.png',
    'extra_roll': 'images/generated/icons/icon_dice_extra.png'
};

const POWERUPS_CONFIG = {
    'shield_token': {
        name: 'SHIELD BARRIER',
        icon: '🛡️',
        desc: 'Protects UFO from capture for 3 turns',
        color: '#38bdf8',
        requiresTarget: true,
        onTrigger: (playerIdx, pawnIdx) => {
            if (!state.shieldedPawns) {
                const ufoCount = (state.pawnPositions && state.pawnPositions[0]) ? state.pawnPositions[0].length : 2;
                state.shieldedPawns = [
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0)
                ];
            }
            state.shieldedPawns[playerIdx][pawnIdx] = 3;
            playSynthSound(500, 1100, 0.4, 'sawtooth');
            if (typeof triggerEmojiReaction === 'function') {
                const currentPos = state.pawnPositions[playerIdx][pawnIdx];
                const coord = pathMaps[playerIdx][currentPos];
                if (coord) {
                    triggerEmojiReaction('shield_activated', playerIdx, coord[0], coord[1]);
                }
            }
            renderPawns();
            return true;
        }
    },
    'freeze_opponent': {
        name: 'CRYSTAL STORM',
        icon: '❄️',
        desc: 'Skips the next player’s dice turn once',
        color: '#3cc6ff',
        requiresTarget: false,
        onTrigger: (playerIdx) => {
            const slots = getActivePlayerSlots();
            const currPos = slots.indexOf(playerIdx);
            const nextPlayer = slots[(currPos + 1) % slots.length];
            
            state.frozenTurns[nextPlayer] = 1;
            playSynthSound(350, 220, 0.5, 'sine');
            if (typeof triggerEmojiReaction === 'function') {
                triggerEmojiReaction('frozen_by_crystal', nextPlayer);
            }
            
            // Add ice aura class to next player's panel
            const nextPanel = document.getElementById(`panel-${nextPlayer}`);
            if (nextPanel) nextPanel.classList.add('frozen-panel');
            return true;
        }
    },
    'teleport_jump': {
        name: 'WORMHOLE PORTAL',
        icon: '🌀',
        desc: 'Teleports starship 6 steps forward',
        color: '#d946ef',
        requiresTarget: true,
        onTrigger: (playerIdx, pawnIdx) => {
            const currentPos = state.pawnPositions[playerIdx][pawnIdx];
            if (currentPos === -1) return false;
            const targetPos = Math.min(currentPos + 6, getFinishPos());

            // Move the pawn forward without consuming/skipping the current turn.
            // We deliberately do NOT call finishTurnPawnLanding so other players'
            // upcoming turns are never cancelled.
            triggerPortalAnimation(playerIdx, pawnIdx);
            state.pawnPositions[playerIdx][pawnIdx] = targetPos;
            playSynthSound(100, 900, 0.5, 'sine');
            if (typeof triggerEmojiReaction === 'function') {
                const coord = pathMaps[playerIdx][currentPos];
                if (coord) {
                    triggerEmojiReaction('teleport_wormhole', playerIdx, coord[0], coord[1]);
                }
            }

            setTimeout(() => {
                renderPawns();
                if (typeof raiseToast === 'function') {
                    raiseToast(`🌀 WORMHOLE! ${players[playerIdx].name} jumped 6 steps forward!`, '🌀');
                }
                if (typeof updateTurnUIVisually === 'function') updateTurnUIVisually();
            }, 600);
            return true;
        }
    },
    'rocket_boost': {
        name: 'ROCKET BOOST',
        icon: '🚀',
        desc: 'Instantly advances starship 10 steps',
        color: '#ef4444',
        requiresTarget: true,
        onTrigger: (playerIdx, pawnIdx) => {
            const currentPos = state.pawnPositions[playerIdx][pawnIdx];
            if (currentPos === -1) return false;
            const targetPos = Math.min(currentPos + 10, getFinishPos());

            // Move the pawn forward without consuming/skipping the current turn.
            // We deliberately do NOT call finishTurnPawnLanding so other players'
            // upcoming turns are never cancelled.
            triggerRocketAnimation(playerIdx, pawnIdx);
            state.pawnPositions[playerIdx][pawnIdx] = targetPos;
            playSynthSound(1000, 200, 0.6, 'sawtooth');
            if (typeof triggerEmojiReaction === 'function') {
                const coord = pathMaps[playerIdx][currentPos];
                if (coord) {
                    triggerEmojiReaction('rocket_boost', playerIdx, coord[0], coord[1]);
                }
            }

            setTimeout(() => {
                renderPawns();
                if (typeof raiseToast === 'function') {
                    raiseToast(`🚀 ROCKET BOOST! ${players[playerIdx].name} blasted 10 steps forward!`, '🚀');
                }
                if (typeof updateTurnUIVisually === 'function') updateTurnUIVisually();
            }, 700);
            return true;
        }
    },
    'lightning_fire': {
        name: 'LIGHTNING CORE',
        icon: '🔥',
        desc: 'Burning pawn captures opponents that touch it',
        color: '#ff4500',
        requiresTarget: true,
        onTrigger: (playerIdx, pawnIdx) => {
            if (!state.burningPawns) {
                const ufoCount = (state.pawnPositions && state.pawnPositions[0]) ? state.pawnPositions[0].length : 2;
                state.burningPawns = [
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0),
                    Array(ufoCount).fill(0)
                ];
            }
            state.burningPawns[playerIdx][pawnIdx] = 3;
            playSynthSound(900, 1600, 0.4, 'sawtooth');
            if (typeof triggerEmojiReaction === 'function') {
                const currentPos = state.pawnPositions[playerIdx][pawnIdx];
                const coord = pathMaps[playerIdx][currentPos];
                if (coord) {
                    triggerEmojiReaction('shield_activated', playerIdx, coord[0], coord[1]);
                }
            }
            renderPawns();
            return true;
        }
    },
    'extra_roll': {
        name: 'TIME LOOP',
        icon: '🎲',
        desc: 'Grants an immediate extra roll',
        color: '#22c55e',
        requiresTarget: false,
        onTrigger: (playerIdx) => {
            state.hasRolled = false;
            state.lastRoll = 0;
            state.isAnimating = false;
            playSynthSound(800, 1600, 0.35, 'sine');
            updateTurnUIVisually();
            return true;
        }
    }
};

class PowerUpManager {
    constructor() {
        this.registry = POWERUPS_CONFIG;
    }

    // Award a random powerup with appropriate balancing, streak, and comeback weighting
    rewardRandomPowerup(playerIdx) {
        const currentPowerups = state.playerPowerups[playerIdx] || [];
        if (currentPowerups.length >= 3) {
            // Inventory slots full
            return;
        }

        const keys = Object.keys(this.registry);
        // Ensure active maximum of 1 of each powerup type in inventory
        const availableKeys = keys.filter(key => !currentPowerups.includes(key));

        if (availableKeys.length === 0) {
            // No new types of powerup can be added
            return;
        }

        let selectedKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

        // Comeback assist system: increase likelihood of Shield/Rocket boost for struggling players
        const completedCount = state.pawnPositions[playerIdx].filter(p => p === getFinishPos()).length;
        const capturedTimes = state.timesCaptured[playerIdx] || 0;
        const isStruggling = (completedCount === 0 && capturedTimes > 1);

        if (isStruggling && Math.random() < 0.6) {
            const defKeys = ['shield_token', 'rocket_boost', 'teleport_jump'].filter(key => !currentPowerups.includes(key));
            if (defKeys.length > 0) {
                selectedKey = defKeys[Math.floor(Math.random() * defKeys.length)];
            }
        }

        state.playerPowerups[playerIdx].push(selectedKey);
        
        playSynthSound(620, 1150, 0.45, 'triangle');
        
        this.renderInventory();

        // Trigger popping glow popped highlight state
        const slotIdx = state.playerPowerups[playerIdx].length - 1;
        setTimeout(() => {
            const deck = document.getElementById(`powerup-deck-${playerIdx}`);
            if (deck) {
                const slots = deck.querySelectorAll('.powerup-slot');
                if (slots && slots[slotIdx]) {
                    slots[slotIdx].classList.add('powerup-slot-glowing-pop');
                    setTimeout(() => {
                        slots[slotIdx].classList.remove('powerup-slot-glowing-pop');
                    }, 1500);
                }
            }
        }, 100);
    }

    // Interactive deck click triggers activation
    activatePowerUp(playerIdx, slotIdx, isNetworkAction = false) {
        if (state.isAnimating) return;

        const powerupKey = state.playerPowerups[playerIdx][slotIdx];
        if (!powerupKey) return;
        const config = this.registry[powerupKey];
        if (!config) return;

        if (playerIdx !== state.activePlayer) {
            return;
        }

        if (config.requiresTarget) {
            // Cancel targeting if already active on this slot
            if (state.activePowerUpTarget && state.activePowerUpTarget.slotIdx === slotIdx) {
                state.activePowerUpTarget = null;
                syncSelectableGlows();
                return;
            }

            // Check if there is at least one active pawn on track to select
            const hasTargetable = state.pawnPositions[playerIdx].some(pos => pos >= 0 && pos < getFinishPos());
            if (!hasTargetable) {
                return;
            }
            
            state.activePowerUpTarget = { key: powerupKey, slotIdx: slotIdx };
            syncSelectableGlows();
        } else {
            // Activate immediate powerup
            if (state.isMultiplayer && window.Multiplayer && !isNetworkAction) {
                window.Multiplayer.broadcastAction('ACTIVATE_POWERUP', { playerIdx, slotIdx });
            }
            const success = config.onTrigger(playerIdx);
            if (success !== false) {
                state.playerPowerups[playerIdx].splice(slotIdx, 1);
            }
            state.activePowerUpTarget = null;
            this.renderInventory();
        }
    }

    // Run custom target triggers on pawns
    resolveTargetedPowerUp(pawnIdx, isNetworkAction = false) {
        if (!state.activePowerUpTarget) return;
        const playerIdx = state.activePlayer;
        const { key, slotIdx } = state.activePowerUpTarget;
        
        // Safety guard: validate indices and ensure positive/negative bounds are correct
        if (pawnIdx < 0 || !state.pawnPositions[playerIdx] || pawnIdx >= state.pawnPositions[playerIdx].length) {
            state.activePowerUpTarget = null;
            return;
        }
        
        const config = this.registry[key];
        if (!config) return;

        // Execute power-up trigger first. If it succeeds, strip it from inventory safely.
        if (state.isMultiplayer && window.Multiplayer && !isNetworkAction) {
            window.Multiplayer.broadcastAction('ACTIVATE_POWERUP', { playerIdx, slotIdx, targetPawn: pawnIdx });
        }
        const success = config.onTrigger(playerIdx, pawnIdx);
        
        if (success !== false) {
            state.playerPowerups[playerIdx].splice(slotIdx, 1);
        }

        state.activePowerUpTarget = null;
        this.renderInventory();
        syncSelectableGlows();
    }

    // Refresh dynamic slot grids visually
    renderInventory() {
        const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
        for (let i = 0; i < 4; i++) {
            const holder = document.getElementById(`held-powerups-${i}`);
            if (holder) {
                holder.style.display = isMini ? 'none' : '';
            }
            if (isMini) continue;

            const container = document.getElementById(`powerup-deck-${i}`);
            if (!container) continue;

            const items = state.playerPowerups[i];
            let html = '';
            
            for (let j = 0; j < 3; j++) {
                const itemKey = items[j];
                if (itemKey) {
                    const info = this.registry[itemKey];
                    const isLocked = (i !== state.activePlayer);
                    const activeClass = isLocked ? 'powerup-slot-locked' : 'powerup-slot-active';
                    html += `
                        <div class="powerup-slot ${activeClass} powerup-slot-colored" 
                             onmousedown="handleSlotPressStart(event, ${i}, ${j})"
                             ontouchstart="handleSlotPressStart(event, ${i}, ${j})"
                             onmouseup="handleSlotPressEnd(event, ${i}, ${j})"
                             onmouseleave="handleSlotPressEnd(event, ${i}, ${j})"
                             ontouchend="handleSlotPressEnd(event, ${i}, ${j})"
                             ontouchcancel="handleSlotPressEnd(event, ${i}, ${j})"
                             onclick="handleSlotClick(event, ${i}, ${j})"
                             style="--slot-color:${info.color}; --slot-color-glow:${info.color}50;">
                            <span class="powerup-slot-icon">
                                ${POWERUP_ICON_SRCS[itemKey] ? `<img src="${POWERUP_ICON_SRCS[itemKey]}" style="width: 24px; height: 24px; object-fit: contain; vertical-align: middle;" />` : info.icon}
                            </span>
                            <span class="powerup-slot-text">${info.name.split(' ')[0]}</span>
                            ${isLocked ? '<div class="powerup-slot-lock-overlay">🔒</div>' : ''}
                            <div class="powerup-tooltip">
                                <div style="font-weight:900; color:var(--slot-color); margin-bottom:2px;">${info.name}</div>
                                <div style="font-size:0.55rem; opacity:0.85; line-height:1.2;">${info.desc}</div>
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="powerup-slot powerup-slot-empty">
                            <span class="powerup-slot-icon" style="opacity:0.25;">❔</span>
                            <span class="powerup-slot-text" style="opacity:0.25;">Empty</span>
                        </div>
                    `;
                }
            }
            container.innerHTML = html;
        }
    }

    // Handle Power cells particle render overlaps and map ticks
    tickPowerUpZones() {
        // Ticks down temporary created safe-zones
        if (state.temporarySafeZones) {
            state.temporarySafeZones = state.temporarySafeZones.map(zone => {
                zone.turnsLeft--;
                return zone;
            }).filter(zone => zone.turnsLeft > 0);
        }
    }
}

const gamePowerUpEngine = new PowerUpManager();

// Long-press and click handler states & callbacks for touch devices / PCs
let slotLongPressTimeout = null;
let isLongPressActive = false;

function handleSlotPressStart(event, playerIdx, slotIdx) {
    isLongPressActive = false; // reset potential stuck state
    if (slotLongPressTimeout) {
        clearTimeout(slotLongPressTimeout);
    }
    
    slotLongPressTimeout = setTimeout(() => {
        isLongPressActive = true;
        
        // Find slot element and show tooltip
        const deck = document.getElementById(`powerup-deck-${playerIdx}`);
        if (deck) {
            const slots = deck.querySelectorAll('.powerup-slot');
            if (slots && slots[slotIdx]) {
                slots[slotIdx].classList.add('show-tooltip');
            }
        }
        
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(30);
        }
    }, 450);
}

function handleSlotPressEnd(event, playerIdx, slotIdx) {
    if (slotLongPressTimeout) {
        clearTimeout(slotLongPressTimeout);
        slotLongPressTimeout = null;
    }
    
    const deck = document.getElementById(`powerup-deck-${playerIdx}`);
    if (deck) {
        const slots = deck.querySelectorAll('.powerup-slot');
        if (slots && slots[slotIdx]) {
            slots[slotIdx].classList.remove('show-tooltip');
        }
    }
    
    if (isLongPressActive) {
        setTimeout(() => {
            isLongPressActive = false;
        }, 80);
    }
}

function handleSlotClick(event, playerIdx, slotIdx) {
    if (isLongPressActive) {
        isLongPressActive = false; // self-heal stuck flags immediately
        event.stopPropagation();
        event.preventDefault();
        return;
    }
    triggerPowerUpSlot(playerIdx, slotIdx);
}

// Exposed global action binders
function triggerPowerUpSlot(playerIdx, slotIdx, isNetworkAction = false) {
    const powerupKey = state.playerPowerups[playerIdx][slotIdx];
    const config = gamePowerUpEngine.registry[powerupKey];
    
    if (state.isMultiplayer && window.Multiplayer && !isNetworkAction && config && !config.requiresTarget) {
        window.Multiplayer.broadcastAction('ACTIVATE_POWERUP', {
            playerIdx: playerIdx,
            slotIdx: slotIdx
        });
    }
    gamePowerUpEngine.activatePowerUp(playerIdx, slotIdx, isNetworkAction);
}

// Target-specific cell DOM updater instead of rebuilding the entire board
function updateCellDOMForPowerCell(r, c) {
    if (typeof document === 'undefined') return;
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (!cell) return;

    const powerCell = powerCellAt(r, c);
    if (powerCell) {
        cell.classList.add('power-cell-glow');
        let marker = cell.querySelector('.path-powerup-emoji');
        if (!marker) {
            marker = document.createElement('span');
            marker.className = 'path-powerup-emoji';
            cell.appendChild(marker);
        }
        const info = POWERUPS_CONFIG[powerCell.type];
        const iconSrc = POWERUP_ICON_SRCS[powerCell.type];
        if (iconSrc) {
            marker.innerHTML = `<img src="${iconSrc}" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle;" />`;
        } else {
            marker.textContent = info ? info.icon : '✨';
        }
        marker.title = info ? info.name : 'Power-up';
    } else {
        cell.classList.remove('power-cell-glow');
        const marker = cell.querySelector('.path-powerup-emoji');
        if (marker) {
            marker.remove();
        }
    }
}

// Relocates active power cells when hit and triggers choice instantly
function hitPowerCellAndRelocate(r, c, playerIdx, pawnIdx) {
    const origIndex = state.powerCells.findIndex(p => {
        const pcc = powerCellCoord(p);
        return pcc && pcc[0] === r && pcc[1] === c;
    });
    if (origIndex !== -1) {
        const powerCell = state.powerCells[origIndex];
        const type = powerCell.type || 'shield_token';

        // Banish matching cell instantly (removes it from the list of active power-ups)
        state.powerCells.splice(origIndex, 1);
        
        // Update only the affected cell in the board DOM (extremely lightweight!)
        updateCellDOMForPowerCell(r, c);
        
        // Add to inventory instead of auto-activating, providing tactical depth!
        const config = POWERUPS_CONFIG[type];
        if (config) {
            playSynthSound(700, 1200, 0.45, 'triangle');
            if (config.requiresTarget) {
                const targetPawn = (typeof pawnIdx === 'number' && pawnIdx >= 0) ? pawnIdx : 0;
                config.onTrigger(playerIdx, targetPawn);
            } else {
                config.onTrigger(playerIdx);
            }
        }

        // Delay the respawning of another random power-up by 3.5 seconds
        setTimeout(() => {
            // Find another standard path tile that is not currently a portal or a safe tile
            const candidateTrack = commonTrack.filter(coord => {
                const isSafe = safeCoordinates.some(sc => sc[0] === coord[0] && sc[1] === coord[1]);
                const isPortal = state.powerCells.some(pc => {
                    const pcc = powerCellCoord(pc);
                    return pcc && pcc[0] === coord[0] && pcc[1] === coord[1];
                });
                return !isSafe && !isPortal;
            });

            if (candidateTrack.length > 0) {
                // Select one that is not directly adjacent to other portals if possible
                let bestPicks = candidateTrack.filter(coord => {
                    return !state.powerCells.some(pc => {
                        const pcc = powerCellCoord(pc);
                        return pcc && Math.abs(pcc[0] - coord[0]) <= 1 && Math.abs(pcc[1] - coord[1]) <= 1;
                    });
                });
                if (bestPicks.length === 0) {
                    bestPicks = candidateTrack;
                }
                const randomPick = bestPicks[Math.floor(Math.random() * bestPicks.length)];
                
                const powerTypes = ['shield_token', 'freeze_opponent', 'teleport_jump', 'rocket_boost', 'lightning_fire', 'extra_roll'];
                const newType = powerTypes[Math.floor(Math.random() * powerTypes.length)];
                
                state.powerCells.push({
                    r: randomPick[0],
                    c: randomPick[1],
                    type: newType
                });
                
                // Update only the newly spawned cell visually in the board DOM
                updateCellDOMForPowerCell(randomPick[0], randomPick[1]);
                renderPawns();
            }
        }, 3500);
    }
}
