// Beautiful custom dynamic Game Board generation

// Injection of Custom Debug and Pulsing Safe Styles
if (typeof document !== 'undefined') {
    if (!document.getElementById('board-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'board-custom-styles';
        style.innerHTML = `
            @keyframes pulsingSafeGlow {
                0% { box-shadow: 0 0 4px rgba(255, 0, 102, 0.4), inset 0 0 4px rgba(255, 0, 102, 0.2); border-color: rgba(255, 0, 102, 0.6); }
                50% { box-shadow: 0 0 15px rgba(255, 0, 102, 0.95), inset 0 0 10px rgba(255, 0, 102, 0.5); border-color: rgba(255, 0, 102, 1); }
                100% { box-shadow: 0 0 4px rgba(255, 0, 102, 0.4), inset 0 0 4px rgba(255, 0, 102, 0.2); border-color: rgba(255, 0, 102, 0.6); }
            }

            .pulsing-safe-warning {
                animation: pulsingSafeGlow 1.2s infinite ease-in-out !important;
                background-color: rgba(255, 0, 102, 0.15) !important;
            }

            .debug-coord-overlay {
                position: absolute;
                font-size: 0.45rem;
                color: rgba(255, 255, 255, 0.5);
                pointer-events: none;
                z-index: 2;
                top: 2px;
                left: 2px;
                font-family: monospace;
            }

            .board-coord-tooltip {
                position: absolute;
                background: rgba(8, 20, 52, 0.98);
                border: 1px solid var(--cyan, #00e5ff);
                box-shadow: 0 0 15px rgba(0, 229, 255, 0.5);
                color: #ffffff;
                padding: 8px 12px;
                border-radius: 8px;
                font-family: 'Orbitron', 'Space Grotesk', sans-serif;
                font-size: 0.65rem;
                text-align: center;
                pointer-events: none;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.15s ease-in-out;
                z-index: 15000;
            }
        `;
        document.head.appendChild(style);
    }
}

// Global debug state initialization
if (typeof state !== 'undefined' && typeof state.debugCoordinatesEnabled === 'undefined') {
    state.debugCoordinatesEnabled = false;
}

function buildBoardDOM() {
    const board = document.getElementById('game-board');
    if (!board) return;

    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    const targetGrid = isMini ? '11' : '15';
    const currentGrid = board.getAttribute('data-grid-mode');

    // Optimization to avoid full flashes mid-game!
    const isAlreadyBuilt = board.querySelector('.cell') && board.querySelector('.center-finish') && currentGrid === targetGrid;
    if (isAlreadyBuilt) {
        refreshExistingBoardDOM(board);
        return;
    }

    board.innerHTML = '';
    board.setAttribute('data-grid-mode', targetGrid);

    if (isMini) {
        board.style.gridTemplateColumns = 'repeat(11, minmax(0, 1fr))';
        board.style.gridTemplateRows = 'repeat(11, minmax(0, 1fr))';
        board.style.setProperty('--cell-size', 'calc(var(--board-size) / 11)');
    } else {
        board.style.gridTemplateColumns = 'repeat(15, minmax(0, 1fr))';
        board.style.gridTemplateRows = 'repeat(15, minmax(0, 1fr))';
        board.style.setProperty('--cell-size', 'calc(var(--board-size) / 15)');
    }

    const maxRows = isMini ? 11 : 15;
    const maxCols = isMini ? 11 : 15;

    for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < maxCols; c++) {
            // Check Home Bases slots
            if (isMini) {
                if (r < 4 && c < 4) { if (r === 0 && c === 0) createHomeBaseDOM(board, 0); continue; }
                if (r < 4 && c >= 7) { if (r === 0 && c === 7) createHomeBaseDOM(board, 1); continue; }
                if (r >= 7 && c < 4) { if (r === 7 && c === 0) createHomeBaseDOM(board, 2); continue; }
                if (r >= 7 && c >= 7) { if (r === 7 && c === 7) createHomeBaseDOM(board, 3); continue; }

                // Check center triangles finish area
                if (r >= 4 && r <= 6 && c >= 4 && c <= 6) {
                    if (r === 4 && c === 4) createCenterFinishDOM(board);
                    continue;
                }
            } else {
                if (r < 6 && c < 6) { if (r === 0 && c === 0) createHomeBaseDOM(board, 0); continue; }
                if (r < 6 && c >= 9) { if (r === 0 && c === 9) createHomeBaseDOM(board, 1); continue; }
                if (r >= 9 && c < 6) { if (r === 9 && c === 0) createHomeBaseDOM(board, 2); continue; }
                if (r >= 9 && c >= 9) { if (r === 9 && c === 9) createHomeBaseDOM(board, 3); continue; }

                // Check center triangles finish area
                if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
                    if (r === 6 && c === 6) createCenterFinishDOM(board);
                    continue;
                }
            }

            // Create individual grid cell
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.gridRow = (r + 1);
            cell.style.gridColumn = (c + 1);
            cell.id = `cell-${r}-${c}`;

            // Distinguish pathways colors
            if (isMini) {
                if (r === 5 && c >= 1 && c <= 4) cell.classList.add('green-path');
                if (c === 5 && r >= 1 && r <= 4) cell.classList.add('yellow-path');
                if (r === 5 && c >= 6 && c <= 9) cell.classList.add('blue-path');
                if (c === 5 && r >= 6 && r <= 9) cell.classList.add('red-path');
            } else {
                if (r === 7 && c >= 1 && c <= 5) cell.classList.add('green-path');
                if (c === 7 && r >= 1 && r <= 5) cell.classList.add('yellow-path');
                if (r === 7 && c >= 9 && c <= 13) cell.classList.add('blue-path');
                if (c === 7 && r >= 9 && r <= 13) cell.classList.add('red-path');
            }

            // Standard Safe points markers (★)
            const safeList = isMini ? miniSafeCoordinates : safeCoordinates;
            const isSafe = safeList.some(coord => coord[0] === r && coord[1] === c);
            const isTempSafe = state.temporarySafeZones && state.temporarySafeZones.some(tz => tz.r === r && tz.c === c);
            if (isSafe || isTempSafe) {
                cell.classList.add('safe');
                if (isTempSafe) {
                    cell.classList.add('temp-safe-zone');
                }
                
                // Pulse safe visual warnings if opponent within 3 steps
                if (isOpponentNearbySafeCell(r, c)) {
                    cell.classList.add('pulsing-safe-warning');
                }
            }

            // Power-up pickup markers on the path
            const powerCell = isMini ? null : powerCellAt(r, c);
            if (powerCell) {
                cell.classList.add('power-cell-glow');
                const info = typeof POWERUPS_CONFIG !== 'undefined' ? POWERUPS_CONFIG[powerCell.type] : null;
                const marker = document.createElement('span');
                marker.className = 'path-powerup-emoji';
                const iconSrc = (typeof POWERUP_ICON_SRCS !== 'undefined') ? POWERUP_ICON_SRCS[powerCell.type] : null;
                if (iconSrc) {
                    marker.innerHTML = `<img src="${iconSrc}" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle;" />`;
                } else {
                    marker.textContent = info ? info.icon : '✨';
                }
                marker.title = info ? info.name : 'Power-up';
                cell.appendChild(marker);
            }

            // Add Entry direction arrows symbols as clean child spans without innerHTML overwrite
            const entryArrowInfo = isMini ? (
                                   (r === 4 && c === 1) ? { char: '→', style: 'color:var(--green);bottom:2px;right:4px;' } :
                                   (r === 1 && c === 6) ? { char: '↓', style: 'color:var(--yellow);bottom:2px;left:4px;' } :
                                   (r === 6 && c === 9) ? { char: '←', style: 'color:var(--blue);top:2px;left:4px;' } :
                                   (r === 9 && c === 4) ? { char: '↑', style: 'color:var(--red);top:2px;right:4px;' } : null
                               ) : (
                                   (r === 6 && c === 1) ? { char: '→', style: 'color:var(--green);bottom:2px;right:4px;' } :
                                   (r === 1 && c === 8) ? { char: '↓', style: 'color:var(--yellow);bottom:2px;left:4px;' } :
                                   (r === 8 && c === 13) ? { char: '←', style: 'color:var(--blue);top:2px;left:4px;' } :
                                   (r === 13 && c === 6) ? { char: '↑', style: 'color:var(--red);top:2px;right:4px;' } : null
                               );
            if (entryArrowInfo) {
                const arrSpan = document.createElement('span');
                arrSpan.className = 'entry-arrow';
                arrSpan.style.cssText = entryArrowInfo.style;
                arrSpan.textContent = entryArrowInfo.char;
                cell.appendChild(arrSpan);
            }

            // Debug coordinate overlay if active
            updateDebugOverlayOnCell(r, c, cell);

            // Add interactive events for the coordinate tooltips
            cell.addEventListener('mousedown', (e) => handleCellPressStart(e, r, c));
            cell.addEventListener('touchstart', (e) => handleCellPressStart(e, r, c), { passive: true });
            cell.addEventListener('mouseup', handleCellPressEnd);
            cell.addEventListener('mouseleave', handleCellPressEnd);
            cell.addEventListener('touchend', handleCellPressEnd);
            cell.addEventListener('touchcancel', handleCellPressEnd);

            board.appendChild(cell);
        }
    }

    // Single event listener (Optimized Event Delegation) instead of 160 individual triggers
    if (!board.hasAttribute('data-delegated')) {
        board.addEventListener('click', (e) => {
            if (isCellLongPressActive) {
                isCellLongPressActive = false;
                return;
            }
            const cell = e.target.closest('.cell');
            if (cell) {
                const parts = cell.id.split('-');
                if (parts.length === 3 && parts[1] !== undefined && parts[2] !== undefined) {
                    const r = parseInt(parts[1], 10);
                    const c = parseInt(parts[2], 10);
                    handleCellClick(r, c);
                }
            } else {
                // Clicking anywhere on center finish zone or empty board area rolls active dice if needed
                const centerFinish = e.target.closest('#center-finish-zone');
                if (centerFinish && !state.hasRolled && !state.isAnimating && state.activeAlienSelect === -1 && !state.activeWarpSelect) {
                    rollPlayerDice(state.activePlayer);
                }
            }
        });
        board.setAttribute('data-delegated', 'true');
    }
}

function refreshExistingBoardDOM(board) {
    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    const maxRows = isMini ? 11 : 15;
    const maxCols = isMini ? 11 : 15;

    for (let r = 0; r < maxRows; r++) {
        for (let c = 0; c < maxCols; c++) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            if (!cell) continue;

            // 1. Safe zone updates
            const safeList = isMini ? miniSafeCoordinates : safeCoordinates;
            const isSafe = safeList.some(coord => coord[0] === r && coord[1] === c);
            const isTempSafe = state.temporarySafeZones && state.temporarySafeZones.some(tz => tz.r === r && tz.c === c);
            if (isSafe || isTempSafe) {
                cell.classList.add('safe');
                if (isTempSafe) {
                    cell.classList.add('temp-safe-zone');
                } else {
                    cell.classList.remove('temp-safe-zone');
                }
            } else {
                cell.classList.remove('safe', 'temp-safe-zone');
            }

            // 2. Pulse safe visual warnings if opponent within 3 steps
            const shouldPulse = (isSafe || isTempSafe) && isOpponentNearbySafeCell(r, c);
            if (shouldPulse) {
                cell.classList.add('pulsing-safe-warning');
            } else {
                cell.classList.remove('pulsing-safe-warning');
            }

            // 3. Power-up state updates
            if (isMini) {
                cell.classList.remove('power-cell-glow');
                const marker = cell.querySelector('.path-powerup-emoji');
                if (marker) marker.remove();
            } else {
                if (typeof updateCellDOMForPowerCell === 'function') {
                    updateCellDOMForPowerCell(r, c);
                } else {
                    // Inline fallback if updateCellDOMForPowerCell is not available yet
                    const powerCell = powerCellAt(r, c);
                    if (powerCell) {
                        cell.classList.add('power-cell-glow');
                        let marker = cell.querySelector('.path-powerup-emoji');
                        if (!marker) {
                            marker = document.createElement('span');
                            marker.className = 'path-powerup-emoji';
                            cell.appendChild(marker);
                        }
                        const info = typeof POWERUPS_CONFIG !== 'undefined' ? POWERUPS_CONFIG[powerCell.type] : null;
                        const iconSrc = (typeof POWERUP_ICON_SRCS !== 'undefined') ? POWERUP_ICON_SRCS[powerCell.type] : null;
                        if (iconSrc) {
                            marker.innerHTML = `<img src="${iconSrc}" style="width: 16px; height: 16px; object-fit: contain; vertical-align: middle;" />`;
                        } else {
                            marker.textContent = info ? info.icon : '✨';
                        }
                        marker.title = info ? info.name : 'Power-up';
                    } else {
                        cell.classList.remove('power-cell-glow');
                        const marker = cell.querySelector('.path-powerup-emoji');
                        if (marker) marker.remove();
                    }
                }
            }

            // 4. Debug coordinate overlay if active
            updateDebugOverlayOnCell(r, c, cell);
        }
    }
}

function createHomeBaseDOM(board, playerIdx) {
    const p = players[playerIdx];
    const base = document.createElement('div');
    base.className = `home-base ${p.color}-base`;
    if (!isPlayerInGame(playerIdx)) {
        base.classList.add('home-base-inactive');
    }
    base.setAttribute('data-player', p.name);
    
    // Set grid area to cover the full corners cleanly
    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    if (isMini) {
        if (playerIdx === 0) {
            base.style.gridArea = "1 / 1 / 5 / 5";
        } else if (playerIdx === 1) {
            base.style.gridArea = "1 / 8 / 5 / 12";
        } else if (playerIdx === 2) {
            base.style.gridArea = "8 / 1 / 12 / 5";
        } else if (playerIdx === 3) {
            base.style.gridArea = "8 / 8 / 12 / 12";
        }
    } else {
        if (playerIdx === 0) {
            base.style.gridArea = "1 / 1 / 7 / 7";
        } else if (playerIdx === 1) {
            base.style.gridArea = "1 / 10 / 7 / 16";
        } else if (playerIdx === 2) {
            base.style.gridArea = "10 / 1 / 16 / 7";
        } else if (playerIdx === 3) {
            base.style.gridArea = "10 / 10 / 16 / 16";
        }
    }

    // Create compact slots grid row
    const slotsGrid = document.createElement('div');
    const ufoCount = (typeof state !== 'undefined' && state && state.gameConfig && state.gameConfig.ufoCount)
        ? state.gameConfig.ufoCount
        : ((typeof lobbyConfig !== 'undefined' && lobbyConfig.ufoCount) ? lobbyConfig.ufoCount : 2);
    slotsGrid.className = `base-slots-grid count-${ufoCount}`;

    for (let i = 0; i < ufoCount; i++) {
        const slot = document.createElement('div');
        slot.className = 'base-slot';
        slot.id = `base-slot-${playerIdx}-${i}`;
        slotsGrid.appendChild(slot);
    }
    base.appendChild(slotsGrid);

    board.appendChild(base);
}

function createCenterFinishDOM(board) {
    const finish = document.createElement('div');
    finish.className = 'center-finish';
    finish.id = 'center-finish-zone';

    const isMini = (state && state.gameConfig && state.gameConfig.mode === 'miniLudo');
    if (isMini) {
        finish.style.gridArea = "5 / 5 / 8 / 8";
    } else {
        finish.style.gridArea = "7 / 7 / 10 / 10";
    }

    // SVG graphics for triangles to remain completely immune to CSS refactors
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1";

    const paths = [
        { d: "M 0,0 L 50,50 L 0,100 Z", fill: "rgba(0, 188, 70, 0.25)", stroke: "var(--green, #00bc46)", class: "green-t" },
        { d: "M 0,0 L 100,0 L 50,50 Z", fill: "rgba(220, 163, 0, 0.25)", stroke: "var(--yellow, #dca300)", class: "yellow-t" },
        { d: "M 100,0 L 100,100 L 50,50 Z", fill: "rgba(0, 119, 230, 0.25)", stroke: "var(--blue, #0077e6)", class: "blue-t" },
        { d: "M 0,100 L 50,50 L 100,100 Z", fill: "rgba(204, 0, 51, 0.25)", stroke: "var(--red, #cc0033)", class: "red-t" }
    ];

    paths.forEach(p => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", p.d);
        path.setAttribute("fill", p.fill);
        path.setAttribute("stroke", p.stroke);
        path.setAttribute("stroke-width", "1");
        path.setAttribute("class", `finish-triangle ${p.class}`);
        svg.appendChild(path);
    });

    finish.appendChild(svg);

    // Finished pawn sectors
    const gSect = document.createElement('div'); gSect.className = 'finish-sector green-sector'; gSect.id = 'finish-sector-0';
    const ySect = document.createElement('div'); ySect.className = 'finish-sector yellow-sector'; ySect.id = 'finish-sector-1';
    const rSect = document.createElement('div'); rSect.className = 'finish-sector red-sector'; rSect.id = 'finish-sector-2';
    const bSect = document.createElement('div'); bSect.className = 'finish-sector blue-sector'; bSect.id = 'finish-sector-3';

    // Apply inline fallback styles for sectors to decouple completely from CSS alterations
    const sectors = [
        { el: gSect, style: "left:0; top:5px; width:32px; height:70px; flex-direction:column; gap:3px; padding-left:3px;" },
        { el: ySect, style: "left:5px; top:0; width:70px; height:32px; flex-direction:row; gap:3px; padding-top:3px;" },
        { el: rSect, style: "left:5px; bottom:0; width:70px; height:32px; flex-direction:row; gap:3px; padding-bottom:3px;" },
        { el: bSect, style: "right:0; top:5px; width:32px; height:70px; flex-direction:column; gap:3px; padding-right:3px;" }
    ];

    sectors.forEach(s => {
        s.el.style.cssText = "position:absolute; display:flex; flex-wrap:wrap; align-content:center; justify-content:center; z-index:10; box-sizing:border-box; pointer-events:none;" + s.style;
    });

    const center = document.createElement('div');
    center.className = 'center-trophy';
    center.style.cssText = "pointer-events:none;";
    center.innerHTML = '🪐';

    finish.appendChild(gSect);
    finish.appendChild(ySect);
    finish.appendChild(rSect);
    finish.appendChild(bSect);
    
    finish.appendChild(center);

    board.appendChild(finish);
}

// Long-press coordinations handler callbacks
let cellLongPressTimeout = null;
let isCellLongPressActive = false;

function handleCellPressStart(event, r, c) {
    isCellLongPressActive = false;
    if (cellLongPressTimeout) {
        clearTimeout(cellLongPressTimeout);
    }
    cellLongPressTimeout = setTimeout(() => {
        isCellLongPressActive = true;
        showCellCoordinateTooltip(event, r, c);
        
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(30);
        }
    }, 450);
}

function handleCellPressEnd() {
    if (cellLongPressTimeout) {
        clearTimeout(cellLongPressTimeout);
        cellLongPressTimeout = null;
    }
    removeCellCoordinateTooltip();
}

function showCellCoordinateTooltip(event, r, c) {
    removeCellCoordinateTooltip();
    
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (!cell) return;

    const trackIndexInfo = getCellTrackIndexes(r, c);
    const tooltip = document.createElement('div');
    tooltip.id = 'board-coord-tooltip';
    tooltip.className = 'board-coord-tooltip';
    tooltip.innerHTML = `
        <div style="font-weight:900;color:var(--cyan, #00e5ff);margin-bottom:2px;">CELL [${r}, ${c}]</div>
        <div style="font-size:0.55rem;opacity:0.9;">Path positions:</div>
        <div style="font-size:0.55rem;color:#00ffcc;">${trackIndexInfo}</div>
    `;

    document.body.appendChild(tooltip);

    const rect = cell.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX + rect.width / 2}px`;
    tooltip.style.top = `${rect.top + window.scrollY - 10}px`;
    tooltip.style.transform = 'translate(-50%, -100%)';
    tooltip.style.opacity = '1';
    tooltip.style.visibility = 'visible';
}

function removeCellCoordinateTooltip() {
    const tooltip = document.getElementById('board-coord-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

function getCellTrackIndexes(r, c) {
    const indexes = [];
    for (let pIdx = 0; pIdx < 4; pIdx++) {
        if (typeof pathMaps !== 'undefined' && pathMaps[pIdx]) {
            const idx = pathMaps[pIdx].findIndex(coord => coord && coord[0] === r && coord[1] === c);
            if (idx !== -1) {
                const colorLabel = ['Green', 'Yellow', 'Red', 'Blue'][pIdx];
                indexes.push(`${colorLabel}: #${idx}`);
            }
        }
    }
    return indexes.length > 0 ? indexes.join(' | ') : 'Off-path';
}

function updateDebugOverlayOnCell(r, c, cell) {
    if (!cell) return;
    let debugLabel = cell.querySelector('.debug-coord-overlay');
    if (typeof state !== 'undefined' && state.debugCoordinatesEnabled) {
        if (!debugLabel) {
            debugLabel = document.createElement('span');
            debugLabel.className = 'debug-coord-overlay';
            cell.appendChild(debugLabel);
        }
        debugLabel.textContent = `${r},${c}`;
    } else {
        if (debugLabel) {
            debugLabel.remove();
        }
    }
}

function isOpponentNearbySafeCell(sr, sc) {
    if (typeof pathMaps === 'undefined' || typeof state === 'undefined') return false;

    // Check all players (pIdx)
    for (let pIdx = 0; pIdx < 4; pIdx++) {
        if (typeof isPlayerInGame === 'function' && !isPlayerInGame(pIdx)) continue;

        // Find if this safe cell [sr, sc] is onto pIdx's path map
        const safePosOnPath = pathMaps[pIdx].findIndex(coord => coord && coord[0] === sr && coord[1] === sc);
        if (safePosOnPath === -1) continue;

        // Check standard shared zones (shared and open to capture)
        if (safePosOnPath >= getHomeStartPos()) continue; // Triangles pathway (home stretch) is safe from other players by design

        // For each of the OTHER players' pawns (opponents of pIdx)
        for (let oppIdx = 0; oppIdx < 4; oppIdx++) {
            if (oppIdx === pIdx) continue;
            if (typeof isPlayerInGame === 'function' && !isPlayerInGame(oppIdx)) continue;

            const oppPawns = state.pawnPositions[oppIdx] || [];
            for (let eIdx = 0; eIdx < oppPawns.length; eIdx++) {
                const oppPos = oppPawns[eIdx];
                if (oppPos < 0 || oppPos >= getHomeStartPos()) continue; // Out of bounds or completed/finished

                const oppCoord = pathMaps[oppIdx][oppPos];
                if (!oppCoord) continue;

                // Find where the opponent's current coordinate is placed on pIdx's path map
                const oppPosOnPIdxPath = pathMaps[pIdx].findIndex(coord => coord && coord[0] === oppCoord[0] && coord[1] === oppCoord[1]);
                if (oppPosOnPIdxPath !== -1) {
                    const diff = safePosOnPath - oppPosOnPIdxPath;
                    if (diff > 0 && diff <= 3) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Global toggle for development convenience
window.toggleDebugCoordinateMode = function() {
    if (typeof state === 'undefined') return false;
    state.debugCoordinatesEnabled = !state.debugCoordinatesEnabled;
    raiseToast(`Debug Coordinates: ${state.debugCoordinatesEnabled ? "ENABLED (Overlays + Long-press active)" : "DISABLED"}`, "🛠️");
    buildBoardDOM(); // Re-render to show/hide debug overlay blocks
    return state.debugCoordinatesEnabled;
};

// Handle body/window release to clear coord tooltips cleanly
if (typeof window !== 'undefined') {
    window.addEventListener('mouseup', removeCellCoordinateTooltip);
    window.addEventListener('touchend', removeCellCoordinateTooltip);
}
