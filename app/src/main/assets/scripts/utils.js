// centralized utility and helper collection for Cosmic Ludo
/**
 * Clamps a numeric value between a specified minimum and maximum bounds.
 */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 */
function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Generates a unique string key for a grid row/column coordinate pair.
 */
function coordKey(r, c) {
    return `${r},${c}`;
}

/**
 * Extracts raw coordinate pair of row and column from a power cell object.
 */
function powerCellCoord(cell) {
    if (!cell) return null;
    if (Array.isArray(cell)) return cell;
    return [cell.r, cell.c];
}

/**
 * Finds a power cell element residing exactly at the row and column coordinates.
 */
function powerCellAt(r, c) {
    if (typeof state === 'undefined' || !state || !state.powerCells) return null;
    return state.powerCells.find(pc => {
        const coord = powerCellCoord(pc);
        return coord && coord[0] === r && coord[1] === c;
    });
}

/**
 * Determines whether two power cells reside on the exact same coordinate.
 */
function powerCellsOverlap(coord, other) {
    const a = powerCellCoord(coord);
    const b = powerCellCoord(other);
    return a && b && a[0] === b[0] && a[1] === b[1];
}

/**
 * Checks if two power cell coordinates are adjacent in a 1-cell radius (including diagonals).
 */
function powerCellsAdjacent(coord, other) {
    const a = powerCellCoord(coord);
    const b = powerCellCoord(other);
    if (!a || !b) return false;
    return Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1;
}

/**
 * Escapes HTML special characters to prevent XSS injection.
 */
function escapeHTML(str) {
    if (typeof str !== 'string') {
        if (str === null || str === undefined) return '';
        str = String(str);
    }
    return str.replace(/[&<>"']/g, function(match) {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return match;
        }
    });
}

// Expose utilities to global window object
if (typeof window !== 'undefined') {
    window.clamp = clamp;
    window.shuffle = shuffle;
    window.coordKey = coordKey;
    window.powerCellCoord = powerCellCoord;
    window.powerCellAt = powerCellAt;
    window.powerCellsOverlap = powerCellsOverlap;
    window.powerCellsAdjacent = powerCellsAdjacent;
    window.escapeHTML = escapeHTML;
}
