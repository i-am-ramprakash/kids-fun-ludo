// Procedural Web Audio API Sound Generator
let audioCtx = null;
let ambientSynth = false;
let droneOscillators = [];
let rArpeggioInterval = null;
let pulseInterval = null;
let ambientMasterGain = null;

let sfxVolume = parseFloat(localStorage.getItem('cosmic_sfx_volume') || '0.6');
let ambientVolume = parseFloat(localStorage.getItem('cosmic_music_volume') || '0.5');

// Audio Cache and Mappings for MP3 Playback
const EMOJI_SFX_MAP = {
    'pawn_captured': 'pawn_captured.mp3',
    'capture_opponent': 'capture_opponent.mp3',
    'roll_six': 'dice_roll_six.mp3',
    'safe_zone': 'pawn_enter_safe.mp3',
    'reach_home': 'pawn_reach_home.mp3',
    'lose_turn': 'lose_turn.mp3',
    'invalid_move': 'dice_invalid.mp3',
    'shield_activated': 'shield_activate.mp3',
    'frozen_by_crystal': 'frozen.mp3',
    'rocket_boost': 'rocket_boost_activate.mp3',
    'teleport_wormhole': 'teleport_activate.mp3',
    'near_victory': 'pawn_near_home.mp3',
    'win_game': 'win_game.mp3',
    'lose_game': 'lose_game.mp3'
};

const audioCache = {};

let currentBgmAudio = null;
let currentBgmFilename = "";

function isAudioMuted() {
    if (typeof document === 'undefined') return false;
    const btn = document.getElementById('audio-toggle');
    if (btn) {
        return btn.innerHTML === '🔇';
    }
    return !ambientSynth;
}

function preloadAudioFiles() {
    for (const key in EMOJI_SFX_MAP) {
        const filename = EMOJI_SFX_MAP[key];
        if (!audioCache[filename]) {
            try {
                const audio = new Audio('audio/' + encodeURIComponent(filename));
                audio.preload = 'auto';
                audioCache[filename] = audio;
            } catch (e) {
                console.warn("Failed to preload: " + filename, e);
            }
        }
    }
    // Also preload BGM files
    const bgmFiles = [
        'music_menu_ambient.mp3',
        'music_multiplayer.mp3',
        'music_game_main.mp3',
        'music_results.mp3',
        'music_snakes_ladder.mp3',
        'music_mini_game_doger.mp3',
        'music_mini_game_shooter.mp3',
        'music_store.mp3'
    ];
    bgmFiles.forEach(filename => {
        if (!audioCache[filename]) {
            try {
                const audio = new Audio('audio/' + encodeURIComponent(filename));
                audio.preload = 'auto';
                audioCache[filename] = audio;
            } catch (e) {
                console.warn("Failed to preload BGM: " + filename, e);
            }
        }
    });
}

function playAudioFile(filename) {
    if (isAudioMuted()) return;
    if (sfxVolume <= 0) return;
    
    try {
        let audio = audioCache[filename];
        if (!audio) {
            audio = new Audio('audio/' + encodeURIComponent(filename));
            audioCache[filename] = audio;
        }
        audio.volume = sfxVolume;
        audio.currentTime = 0;
        const p = audio.play();
        if (p !== undefined) {
            p.catch(err => {
                console.warn("Audio play error for: " + filename, err);
            });
        }
    } catch (e) {
        console.error("Audio error for: " + filename, e);
    }
}

function playBackgroundMusic(filename) {
    if (currentBgmFilename === filename) {
        if (currentBgmAudio) {
            currentBgmAudio.volume = ambientVolume;
            if (isAudioMuted()) {
                currentBgmAudio.pause();
            } else {
                if (currentBgmAudio.paused) {
                    currentBgmAudio.play().catch(err => console.warn("BGM play error", err));
                }
            }
        }
        return;
    }

    if (currentBgmAudio) {
        currentBgmAudio.pause();
        currentBgmAudio = null;
    }

    currentBgmFilename = filename;
    if (!filename) return;

    try {
        let audio = audioCache[filename];
        if (!audio) {
            audio = new Audio('audio/' + encodeURIComponent(filename));
            audioCache[filename] = audio;
        }
        audio.loop = true;
        audio.volume = ambientVolume;
        currentBgmAudio = audio;

        if (!isAudioMuted() && ambientSynth) {
            audio.play().catch(err => {
                console.warn("BGM autoplay prevented or failed for: " + filename, err);
            });
        }
    } catch (e) {
        console.error("BGM creation error", e);
    }
}

function playBackgroundMusicForView(viewId) {
    if (!viewId) return;
    
    let track = "music_menu_ambient.mp3"; // default menu music
    
    switch(viewId) {
        case 'splash-screen':
        case 'login-screen':
        case 'home-screen':
        case 'home':
        case 'leaderboard':
        case 'morefun':
        case 'settings':
            track = 'music_menu_ambient.mp3';
            break;
        case 'profile': // customization shop & premium store
            track = 'music_store.mp3';
            break;
        case 'multiplayer-lobby-screen':
        case 'multiplayer':
            track = 'music_multiplayer.mp3';
            break;
        case 'game-screen':
            track = 'music_game_main.mp3';
            break;
        case 'results-screen':
            track = 'music_results.mp3';
            break;
        case 'snakes-ladders-view':
            track = 'music_snakes_ladder.mp3';
            break;
        case 'cosmic-dodger-view':
            track = 'music_mini_game_doger.mp3';
            break;
        case 'starship-shooter-view':
            track = 'music_mini_game_shooter.mp3';
            break;
        default:
            track = 'music_menu_ambient.mp3';
            break;
    }
    
    playBackgroundMusic(track);
}

// Injection of Volume Slider retro styles
if (typeof document !== 'undefined') {
    if (!document.getElementById('audio-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'audio-custom-styles';
        style.innerHTML = `
            .audio-volume-panel {
                position: absolute;
                bottom: calc(100% + 12px);
                right: 8px;
                background: rgba(4, 10, 31, 0.98);
                border: 1px solid var(--cyan, #00e5ff);
                box-shadow: 0 0 25px rgba(0, 229, 255, 0.4);
                border-radius: 12px;
                padding: 12px 14px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                width: 170px;
                z-index: 15000;
                opacity: 0;
                visibility: hidden;
                transform: translateY(10px) scale(0.95);
                transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                font-family: 'Orbitron', 'Space Grotesk', sans-serif;
            }
            .audio-volume-panel.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0) scale(1);
            }
            .volume-row {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .volume-label-container {
                display: flex;
                justify-content: space-between;
                font-size: 0.65rem;
                letter-spacing: 0.5px;
                color: rgba(255, 255, 255, 0.8);
            }
            .volume-slider {
                -webkit-appearance: none;
                width: 100%;
                height: 5px;
                background: rgba(255, 255, 255, 0.15);
                border-radius: 3px;
                outline: none;
                transition: background 0.15s ease;
            }
            .volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: var(--cyan, #00e5ff);
                box-shadow: 0 0 8px var(--cyan, #00e5ff);
                cursor: pointer;
                transition: transform 0.1s;
            }
            .volume-slider::-webkit-slider-thumb:hover {
                transform: scale(1.15);
            }
            .footer-controls {
                position: relative;
            }
        `;
        document.head.appendChild(style);
    }
}

function startAudioContext() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.error(e);
        }
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Ensure BGM plays
    if (ambientSynth) {
        if (currentBgmAudio) {
            if (currentBgmAudio.paused && !isAudioMuted()) {
                currentBgmAudio.play().catch(err => console.warn("BGM play resume failed", err));
            }
        } else {
            playBackgroundMusicForView(currentScreen || 'splash-screen');
        }
    }
}

function playRealisticDiceRollStart() {
    playAudioFile('dice_roll_star.mp3');
}

let lastClatterTime = 0;
function playRealisticDiceClatter() {
    const now = Date.now();
    if (now - lastClatterTime < 150) return;
    lastClatterTime = now;
    playAudioFile('dice_roll_mid.mp3');
}

function playRealisticDiceLanding() {
    playAudioFile('dice_land.mp3');
}

function playSynthSound(freqStart, freqEnd, duration, type = 'sine') {
    if (isAudioMuted()) return;
    
    // Realistic dice roll sound effects interception
    if (duration === 0.04 && type === 'sawtooth') {
        playRealisticDiceClatter();
        return;
    }
    if (duration === 0.25 && freqStart === 350 && freqEnd === 440) {
        playRealisticDiceLanding();
        return;
    }
    if (duration === 0.2 && freqStart === 440 && freqEnd === 880) {
        playRealisticDiceRollStart();
        return;
    }

    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, audioCtx.currentTime);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, audioCtx.currentTime + duration);
        }
        gain.gain.setValueAtTime(0.12 * sfxVolume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function playExplodeSound() {
    if (isAudioMuted()) return;
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const now = audioCtx.currentTime;
        
        // Noise buffer crash
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.25 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        // Low sub boom
        const sub = audioCtx.createOscillator();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(100, now);
        sub.frequency.linearRampToValueAtTime(25, now + 0.45);
        
        const subGain = audioCtx.createGain();
        subGain.gain.setValueAtTime(0.20 * sfxVolume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        sub.connect(subGain);
        subGain.connect(audioCtx.destination);
        
        noise.start(now);
        noise.stop(now + 0.5);
        sub.start(now);
        sub.stop(now + 0.5);
    } catch(e) {}
}

function playTeleportSound() {
    if (isAudioMuted()) return;
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const now = audioCtx.currentTime;
        
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.7);
        
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 35; // fast wave sweep modulation
        
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 150;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(3000, now + 0.7);
        filter.Q.value = 5.0;
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.18 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.7);
        osc.stop(now + 0.7);
    } catch(e) {}
}

function playPewSound() {
    if (isAudioMuted()) return;
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {}
    }
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const now = audioCtx.currentTime;
        
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1600, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.15 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.15);
    } catch(e) {}
}

function playAlienSound() {
    if (isAudioMuted()) return;
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const now = audioCtx.currentTime;
        
        const osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.45);
        
        const lfo = audioCtx.createOscillator();
        lfo.type = 'triangle';
        lfo.frequency.value = 18;
        
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 200;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(200, now + 0.45);
        filter.Q.value = 6.0;
        
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.12 * sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.46);
        osc.stop(now + 0.46);
    } catch(e) {}
}

function startSpaceAmbientDrone() {
    // Avoid double creation leaks/stacking by cleaning up any active loops first
    stopAllDroneAndLoops();

    if (!audioCtx) return;

    // Master drone gain scaled dynamically by ambientVolume setting
    ambientMasterGain = audioCtx.createGain();
    ambientMasterGain.gain.setValueAtTime(0.14 * ambientVolume, audioCtx.currentTime);
    ambientMasterGain.connect(audioCtx.destination);

    // Sine drones at 55Hz, 82Hz, 110Hz, 165Hz
    const droneFreqs = [55, 82, 110, 165];
    droneFreqs.forEach(f => {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(ambientMasterGain);
            osc.start();
            droneOscillators.push(osc);
        } catch(e) {}
    });

    // Reverb style slow pads over time (65Hz, 98Hz, 130Hz, 196Hz)
    const padFreqs = [65, 98, 130, 196];
    padFreqs.forEach(f => {
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, audioCtx.currentTime);
            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 3.0);
            osc.connect(gain);
            gain.connect(ambientMasterGain);
            osc.start();
            droneOscillators.push(osc);
        } catch(e) {}
    });

    // 4-second Sawtooth Deep Bass Pulse loop saving reference to pulseInterval
    const persistentSetInterval = window.__originalSetInterval || setInterval;
    pulseInterval = persistentSetInterval(() => {
        if (ambientSynth && audioCtx && audioCtx.state !== 'suspended') {
            try {
                const pulseOsc = audioCtx.createOscillator();
                const pulseGain = audioCtx.createGain();
                pulseOsc.type = 'sawtooth';
                pulseOsc.frequency.setValueAtTime(27.5, audioCtx.currentTime);
                pulseOsc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 1.5);
                pulseGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                pulseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
                pulseOsc.connect(pulseGain);
                pulseGain.connect(ambientMasterGain);
                pulseOsc.start();
                pulseOsc.stop(audioCtx.currentTime + 1.5);
            } catch(e) {}
        }
    }, 4000);

    // Triangle arpeggios cycling scale using rArpeggioInterval reference
    const majorScale = [220, 246.94, 277.18, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 783.99];
    let noteIdx = 0;
    rArpeggioInterval = persistentSetInterval(() => {
        if (ambientSynth && audioCtx && audioCtx.state !== 'suspended' && Math.random() > 0.15) {
            try {
                const noteFreq = majorScale[noteIdx];
                const noteOsc = audioCtx.createOscillator();
                const noteGain = audioCtx.createGain();
                noteOsc.type = 'triangle';
                noteOsc.frequency.setValueAtTime(noteFreq, audioCtx.currentTime);
                noteGain.gain.setValueAtTime(0.02, audioCtx.currentTime);
                noteGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
                noteOsc.connect(noteGain);
                noteGain.connect(ambientMasterGain);
                noteOsc.start();
                noteOsc.stop(audioCtx.currentTime + 0.35);

                noteIdx = (noteIdx + 1) % majorScale.length;
            } catch(e) {}
        }
    }, 300);
}

function stopAllDroneAndLoops() {
    if (droneOscillators && droneOscillators.length > 0) {
        droneOscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        droneOscillators = [];
    }
    
    const persistentClearInterval = window.__originalClearInterval || clearInterval;
    if (rArpeggioInterval) {
        persistentClearInterval(rArpeggioInterval);
        rArpeggioInterval = null;
    }
    
    if (pulseInterval) {
        persistentClearInterval(pulseInterval);
        pulseInterval = null;
    }
    
    if (ambientMasterGain) {
        try {
            ambientMasterGain.disconnect();
        } catch(e) {}
        ambientMasterGain = null;
    }
}

function stopAllAudio() {
    stopAllDroneAndLoops();
    if (currentBgmAudio) {
        currentBgmAudio.pause();
    }
}

function toggleAudio() {
    injectVolumePanel();
    startAudioContext();
    ambientSynth = !ambientSynth;
    const btn = document.getElementById('audio-toggle');
    if (btn) {
        if (ambientSynth) {
            btn.innerHTML = '🔊';
            btn.style.boxShadow = '0 0 10px var(--cyan)';
            btn.style.borderColor = 'var(--cyan)';
            
            // Reinitialize and start BGM instead of drone
            if (currentBgmFilename) {
                playBackgroundMusic(currentBgmFilename);
            } else {
                playBackgroundMusicForView(currentScreen || 'splash-screen');
            }
            
            // Show custom volume controls panel
            showVolumePanel();
        } else {
            btn.innerHTML = '🔇';
            btn.style.boxShadow = '';
            btn.style.borderColor = '';
            
            // Instantly stop audio to avoid background activity
            stopAllAudio();
            
            // Hide custom volume controls panel
            hideVolumePanel();
        }
    }
}

function injectVolumePanel() {
    if (typeof document === 'undefined') return;
    const audBtn = document.getElementById('audio-toggle');
    if (!audBtn) return;
    
    if (document.getElementById('audio-volume-panel')) return;
    
    const parent = audBtn.parentElement;
    if (parent) {
        parent.style.position = 'relative';
    }
    
    const panel = document.createElement('div');
    panel.id = 'audio-volume-panel';
    panel.className = 'audio-volume-panel';
    panel.innerHTML = `
        <div class="volume-row">
            <div class="volume-label-container">
                <span>🔊 EFFECTS</span>
                <span id="sfx-vol-val">${Math.round(sfxVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="100" value="${Math.round(sfxVolume * 100)}" class="volume-slider" id="sfx-volume-slider" oninput="updateSFXVolume(this.value)">
        </div>
        <div class="volume-row">
            <div class="volume-label-container">
                <span>🌌 AMBIENT</span>
                <span id="ambient-vol-val">${Math.round(ambientVolume * 100)}%</span>
            </div>
            <input type="range" min="0" max="100" value="${Math.round(ambientVolume * 100)}" class="volume-slider" id="ambient-volume-slider" oninput="updateAmbientVolume(this.value)">
        </div>
    `;
    
    audBtn.parentNode.insertBefore(panel, audBtn);
}

function showVolumePanel() {
    const panel = document.getElementById('audio-volume-panel');
    if (panel) {
        panel.classList.add('show');
    }
}

function hideVolumePanel() {
    const panel = document.getElementById('audio-volume-panel');
    if (panel) {
        panel.classList.remove('show');
    }
}

window.updateSFXVolume = function(val) {
    sfxVolume = parseFloat(val) / 100;
    localStorage.setItem('cosmic_sfx_volume', sfxVolume.toString());
    const label = document.getElementById('sfx-vol-val');
    if (label) {
        label.textContent = `${val}%`;
    }
    const advancedSlider = document.getElementById('settings-sfx-volume');
    if (advancedSlider) advancedSlider.value = sfxVolume;
    const advancedDisplay = document.getElementById('sfx-volume-display');
    if (advancedDisplay) advancedDisplay.innerText = `${val}%`;
    playSynthSound(600, 600, 0.05, 'sine');
};

window.updateAmbientVolume = function(val) {
    ambientVolume = parseFloat(val) / 100;
    localStorage.setItem('cosmic_music_volume', ambientVolume.toString());
    const label = document.getElementById('ambient-vol-val');
    if (label) {
        label.textContent = `${val}%`;
    }
    const advancedSlider = document.getElementById('settings-music-volume');
    if (advancedSlider) advancedSlider.value = ambientVolume;
    const advancedDisplay = document.getElementById('music-volume-display');
    if (advancedDisplay) advancedDisplay.innerText = `${val}%`;
    if (currentBgmAudio) {
        currentBgmAudio.volume = ambientVolume;
    }
};

window.setAmbientVolume = function(vol) {
    ambientVolume = parseFloat(vol);
    localStorage.setItem('cosmic_music_volume', ambientVolume.toString());
    const label = document.getElementById('ambient-vol-val');
    if (label) {
        label.textContent = `${Math.round(ambientVolume * 100)}%`;
    }
    const slider = document.getElementById('ambient-volume-slider');
    if (slider) {
        slider.value = Math.round(ambientVolume * 100);
    }
    if (currentBgmAudio) {
        currentBgmAudio.volume = ambientVolume;
    }
};

window.setSFXVolume = function(vol) {
    sfxVolume = parseFloat(vol);
    localStorage.setItem('cosmic_sfx_volume', sfxVolume.toString());
    const label = document.getElementById('sfx-vol-val');
    if (label) {
        label.textContent = `${Math.round(sfxVolume * 100)}%`;
    }
    const slider = document.getElementById('sfx-volume-slider');
    if (slider) {
        slider.value = Math.round(sfxVolume * 100);
    }
};

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectVolumePanel();
            preloadAudioFiles();
        });
    } else {
        injectVolumePanel();
        preloadAudioFiles();
    }
    
    // Slide-out and close popover panel on click outside
    document.addEventListener('click', (event) => {
        const panel = document.getElementById('audio-volume-panel');
        const toggle = document.getElementById('audio-toggle');
        if (panel && toggle && !panel.contains(event.target) && !toggle.contains(event.target)) {
            panel.classList.remove('show');
        }
    });
}

function playEmojiSFX(type) {
    if (isAudioMuted()) return;
    
    const filename = EMOJI_SFX_MAP[type];
    if (filename) {
        playAudioFile(filename);
        return;
    }
    
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { return; }
    }
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'pawn_captured') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.linearRampToValueAtTime(150, now + 0.35);
            gain.gain.setValueAtTime(0.18 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.36);

            setTimeout(() => {
                if (!audioCtx || audioCtx.state === 'suspended') return;
                try {
                    const osc2 = audioCtx.createOscillator();
                    const gain2 = audioCtx.createGain();
                    osc2.type = 'sawtooth';
                    osc2.connect(gain2);
                    gain2.connect(audioCtx.destination);
                    osc2.frequency.setValueAtTime(380, audioCtx.currentTime);
                    osc2.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.35);
                    gain2.gain.setValueAtTime(0.18 * sfxVolume, audioCtx.currentTime);
                    gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
                    osc2.start();
                    osc2.stop(audioCtx.currentTime + 0.36);
                } catch(e) {}
            }, 300);
        }
        else if (type === 'capture_opponent') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.setValueAtTime(350, now + 0.08);
            osc.frequency.setValueAtTime(500, now + 0.16);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.35);
            
            gain.gain.setValueAtTime(0.15 * sfxVolume, now);
            gain.gain.setValueAtTime(0.15 * sfxVolume, now + 0.08);
            gain.gain.setValueAtTime(0.15 * sfxVolume, now + 0.16);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc.start(now);
            osc.stop(now + 0.4);
        }
        else if (type === 'roll_six') {
            osc.type = 'sine';
            const freqs = [330, 392, 440, 523, 659, 784];
            freqs.forEach((f, idx) => {
                osc.frequency.setValueAtTime(f, now + idx * 0.05);
            });
            gain.gain.setValueAtTime(0.16 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.42);
        }
        else if (type === 'safe_zone') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.6);
            gain.gain.setValueAtTime(0.12 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.62);
        }
        else if (type === 'reach_home') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(293, now); 
            osc.frequency.setValueAtTime(349, now + 0.1); 
            osc.frequency.setValueAtTime(440, now + 0.2); 
            osc.frequency.setValueAtTime(587, now + 0.3); 
            
            gain.gain.setValueAtTime(0.14 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            osc.start(now);
            osc.stop(now + 0.52);
        }
        else if (type === 'lose_turn') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.linearRampToValueAtTime(80, now + 0.5);
            gain.gain.setValueAtTime(0.15 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.52);
        }
        else if (type === 'invalid_move') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.setValueAtTime(392, now + 0.08);
            osc.frequency.setValueAtTime(280, now + 0.16);
            gain.gain.setValueAtTime(0.18 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.3);
        }
        else if (type === 'shield_activated') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(1500, now + 0.5);
            gain.gain.setValueAtTime(0.14 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.52);
        }
        else if (type === 'frozen_by_crystal') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(120, now + 0.1);
            osc.frequency.setValueAtTime(880, now + 0.15);
            gain.gain.setValueAtTime(0.15 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
            osc.start(now);
            osc.stop(now + 0.48);
        }
        else if (type === 'rocket_boost') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.6);
            gain.gain.setValueAtTime(0.20 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.62);
        }
        else if (type === 'teleport_wormhole') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1500, now);
            osc.frequency.exponentialRampToValueAtTime(300, now + 0.5);
            gain.gain.setValueAtTime(0.15 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.52);
        }
        else if (type === 'near_victory') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.setValueAtTime(220, now + 0.08);
            osc.frequency.setValueAtTime(180, now + 0.16);
            gain.gain.setValueAtTime(0.12 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.32);
        }
        else if (type === 'win_game') {
            osc.type = 'sine';
            const chord = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
            chord.forEach((f, idx) => {
                osc.frequency.setValueAtTime(f, now + idx * 0.07);
            });
            gain.gain.setValueAtTime(0.22 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.start(now);
            osc.stop(now + 0.75);
        }
        else if (type === 'lose_game') {
            osc.type = 'sine';
            const chord = [440.00, 349.23, 293.66, 220.00, 174.61, 146.83];
            chord.forEach((f, idx) => {
                osc.frequency.setValueAtTime(f, now + idx * 0.12);
            });
            gain.gain.setValueAtTime(0.22 * sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
            osc.start(now);
            osc.stop(now + 0.95);
        }
    } catch(e) {}
}

if (typeof window !== 'undefined') {
    window.stopAllAudio = stopAllAudio;
    window.playEmojiSFX = playEmojiSFX;
    
    // Page Visibility change event listeners to stop all ambient running tracks in background
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAllAudio();
        } else {
            if (ambientSynth) {
                startAudioContext();
            }
        }
    });

    // One-time global user gesture interaction listeners to unlock Web Audio API context
    const unlockAudio = () => {
        startAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('pointerdown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
}

