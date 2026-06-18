// Load the centralized utils script synchronously to ensure availability of helper functions
if (typeof document !== 'undefined') {
    document.write('<script src="scripts/utils.js"></script>');
}

// Species to custom emoji mappings (kept for potential reference/compatibility)
const SPECIES_EMOJIS = {
    "Terran (Human)": "👨‍🚀",
    "Martian Invader": "👽",
    "Andromedan Android": "🤖",
    "Neptunian Explorer": "🧜‍♂️",
    "Gromflomite Bounty Hunter": "👾",
    "Proxima Centaurian Elf": "🧝‍♂️",
    "Cyborg": "🦾",
    "Vulcan": "🖖",
    "Unknown": "👽",
    "Terran": "👨‍🚀",
    "Android": "🤖"
};

// Fallback visual character avatars
const PLAYER_CHARACTERS = ['🟢🛸', '🟡🛸', '🔴🛸', '🔵🛸'];

function getThemePawnEmojis() {
    if (typeof getCurrentThemePawnEmojis === 'function') {
        return getCurrentThemePawnEmojis();
    }
    return PLAYER_CHARACTERS;
}

/**
 * Checks if a given player slot index is mapped to a human player in the current session.
 */
function isHumanInSession(playerIdx) {
    if (typeof state !== 'undefined' && state && state.gameConfig && state.gameConfig.playerTypes) {
        return state.gameConfig.playerTypes[playerIdx] === 'human';
    }
    if (typeof lobbyConfig !== 'undefined' && lobbyConfig && lobbyConfig.playerTypes) {
        return lobbyConfig.playerTypes[playerIdx] === 'human';
    }
    return false;
}

/**
 * Resolves the character avatar emoji for the specified player.
 */
function getPlayerCharacter(playerIdx) {
    if (isHumanInSession(playerIdx)) {
        if (typeof commanderProfile !== 'undefined' && commanderProfile.species && typeof SPECIES_EMOJIS !== 'undefined') {
            return SPECIES_EMOJIS[commanderProfile.species] || '🧑‍🚀';
        }
    }
    const themeEmojis = getThemePawnEmojis();
    return themeEmojis[playerIdx] || PLAYER_CHARACTERS[playerIdx] || '🛸';
}

/**
 * Synchronizes character avatar emojis in the scoreboard/lobby.
 */
function initPlayerCharacters() {
    for (let i = 0; i < 4; i++) {
        const el = document.getElementById(`player-char-${i}`);
        if (el) {
            el.textContent = getPlayerCharacter(i);
            if (typeof players !== 'undefined' && players[i]) {
                el.title = players[i].name;
            }
        }
    }
}
