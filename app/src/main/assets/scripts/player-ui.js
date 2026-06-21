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

// Species to custom headshot portrait mappings
window.SPECIES_AVATARS = window.SPECIES_AVATARS || {
    "Terran (Human)": "images/generated/avatars/avatar_terran.png",
    "Martian Invader": "images/generated/avatars/avatar_martian.png",
    "Andromedan Android": "images/generated/avatars/avatar_android.png",
    "Neptunian Explorer": "images/generated/avatars/avatar_neptunian.png",
    "Gromflomite Bounty Hunter": "images/generated/avatars/avatar_gromflomite.png",
    "Proxima Centaurian Elf": "images/generated/avatars/avatar_proxima_elf.png"
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
 * Resolves the character avatar HTML for the specified player.
 */
function getPlayerCharacterHTML(playerIdx) {
    const isMultiplayer = (typeof state !== 'undefined' && state && state.isMultiplayer) || (window.Multiplayer && window.Multiplayer.isOnline);
    let speciesName = "";

    if (isMultiplayer && window.onlinePlayersMap && window.onlinePlayersMap[playerIdx]) {
        const uid = window.onlinePlayersMap[playerIdx];
        const profile = window.onlinePlayersProfiles && window.onlinePlayersProfiles[uid];
        if (profile && profile.species) {
            speciesName = profile.species;
        }
    } else if (isHumanInSession(playerIdx)) {
        if (typeof commanderProfile !== 'undefined' && commanderProfile.species) {
            speciesName = commanderProfile.species;
        }
    }

    let src = "";
    if (speciesName && SPECIES_AVATARS[speciesName]) {
        src = SPECIES_AVATARS[speciesName];
    } else if (isHumanInSession(playerIdx) || isMultiplayer) {
        src = SPECIES_AVATARS["Terran (Human)"];
    } else {
        src = "images/generated/icons/icon_bot.png";
    }

    return `<img src="${src}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: contain; display: block;" />`;
}

/**
 * Resolves the character avatar emoji for the specified player.
 */
function getPlayerCharacter(playerIdx) {
    const isMultiplayer = (typeof state !== 'undefined' && state && state.isMultiplayer) || (window.Multiplayer && window.Multiplayer.isOnline);
    if (isMultiplayer && window.onlinePlayersMap && window.onlinePlayersMap[playerIdx]) {
        const uid = window.onlinePlayersMap[playerIdx];
        const profile = window.onlinePlayersProfiles && window.onlinePlayersProfiles[uid];
        if (profile && profile.species && typeof SPECIES_EMOJIS !== 'undefined') {
            return SPECIES_EMOJIS[profile.species] || '🧑‍🚀';
        }
    }

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
            el.innerHTML = getPlayerCharacterHTML(i);
            if (typeof players !== 'undefined' && players[i]) {
                el.title = players[i].name;
            }
        }
    }
}
