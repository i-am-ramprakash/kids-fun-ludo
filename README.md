# Space Ludo

A sci-fi themed Ludo board game for Android built with Kotlin, Jetpack Compose, and WebView-powered HTML5/JavaScript.

![Android](https://img.shields.io/badge/Android-3DDC84?style=flat&logo=android)
![Kotlin](https://img.shields.io/badge/Kotlin-7F52FF?style=flat&logo=kotlin)
![Jetpack Compose](https://img.shields.io/badge/Jetpack_Compose-4285F4?style=flat&logo=jetpackcompose)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase)

## About

Space Ludo is a modern reimagining of the classic Ludo board game, set in a futuristic space environment. Players command UFO pilots across cosmic boards, utilizing power-ups and special abilities to outmaneuver opponents.

- UFO/space-themed pawns ("pilots") instead of traditional tokens
- Interactive 3D dice with physics-based rolling
- Power-up systems: shields, freeze, teleport, rocket boost, and more
- Alien deployment mechanics and warp drive teleportation
- Multiple game modes: Pass & Play, Quick Play, UFO Clash, Rockets & Wormholes, and Online Multiplayer
- Embedded mini-games: Nebula Flight Run (dodger) and Starship Assault (shooter)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Android Native** | Kotlin 2.2, Jetpack Compose (Material3), Android SDK 36 |
| **Game Rendering** | HTML5, CSS3, WebView |
| **Game Logic** | Vanilla JavaScript (ES6+), HTML5 Canvas |
| **Audio** | Web Audio API |
| **Backend** | Firebase Auth + Cloud Firestore |
| **Networking** | Retrofit, Moshi, OkHttp |
| **Local Storage** | Room Database |
| **Concurrency** | Kotlin Coroutines |

## Project Structure

```
kids-fun-ludo/
├── app/src/main/
│   ├── java/com/example/
│   │   ├── MainActivity.kt         # WebView container + Compose theme
│   │   └── ui/theme/               # App theming
│   └── assets/
│       ├── space_ludo.html         # Main HTML entry point
│       ├── scripts/
│       │   ├── game-config.js      # Game configuration constants
│       │   ├── state.js            # Game state management
│       │   ├── board.js            # Board rendering and logic
│       │   ├── bots.js             # AI opponent logic
│       │   ├── movement.js         # Pawn movement and pathing
│       │   ├── powerups.js         # Power-up system
│       │   ├── dice.js             # Dice rolling mechanics
│       │   ├── setup.js            # Pre-game configuration screens
│       │   ├── navigation.js       # Screen transitions
│       │   ├── player-ui.js        # Player UI elements
│       │   ├── ui.js               # General UI helpers
│       │   ├── audio.js            # Sound effects engine
│       │   ├── effects.js          # Visual effects
│       │   ├── multiplayer.js      # Firebase multiplayer (ES Module)
│       │   ├── snakes_ladders.js   # Rockets & Wormholes mode
│       │   ├── dodger.js           # Nebula Flight Run mini-game
│       │   ├── shooter.js          # Starship Assault mini-game
│       │   └── utils.js            # Utility functions
│       └── styles/
│           ├── main.css            # Base styles
│           ├── board.css           # Board-specific styles
│           ├── setup.css           # Setup screen styles
│           ├── animations.css      # Animation keyframes
│           ├── responsive.css      # Responsive layout
│           └── fonts/              # Custom font files
├── gradle/libs.versions.toml       # Version catalog
├── build.gradle.kts                # Project-level build config
├── app/build.gradle.kts            # App module build config
└── repair.py                       # Automated HTML repair script
```

## Game Modes

| Mode | Players | Description |
|------|---------|-------------|
| **Pass & Play** | 2-4 (local) | Classic turn-based with friends on one device |
| **Quick Play** | 1 vs 3 AI | Solo match against AI opponents |
| **UFO Clash** | 2-4 (local) | Extreme mode with enhanced power-ups |
| **Rockets & Wormholes** | 2-4 (local) | Snakes & Ladders inspired variant |
| **Online Multiplayer** | 2-4 (online) | Firebase Realtime Database matchmaking |

## Power-Ups

- **Shield Barrier** -- Protects from capture for 3 turns
- **Crystal Storm** -- Freezes opponent's next turn
- **Wormhole Portal** -- Teleport 6 steps forward
- **Rocket Boost** -- Advance 10 steps instantly
- **Lightning Core** -- Burning pawn captures on touch
- **Time Loop** -- Grants an extra dice roll

## Building

**Prerequisites:**
- JDK 11+
- Android SDK (compile/target 36, min 24)
- Gradle (wrapper included)

**Debug build:**
```bash
./gradlew.bat assembleDebug
```

**Release build:**
```bash
./gradlew.bat assembleRelease
```

## Testing

```bash
./gradlew.bat test                  # Unit tests
./gradlew.bat connectedAndroidTest  # Instrumented tests
```

**Testing frameworks:** JUnit 4, Robolectric, Roborazzi

## Configuration

### Firebase Config Setup
Multiplayer uses Firebase Auth (Anonymous) with Firestore for real-time game state synchronization. To prevent exposing API keys in Git:
1. Locate the template configuration file at `app/src/main/assets/scripts/firebase-config.example.js`.
2. Copy it to `app/src/main/assets/scripts/firebase-config.js`:
   ```bash
   cp app/src/main/assets/scripts/firebase-config.example.js app/src/main/assets/scripts/firebase-config.js
   ```
3. Open `app/src/main/assets/scripts/firebase-config.js` and enter your actual Firebase API keys and config values. 
*(Note: `firebase-config.js` is ignored by Git in `.gitignore` so your secrets stay safe).*


Release signing is configured via environment variables:
- `KEYSTORE_PATH`
- `STORE_PASSWORD`
- `KEY_PASSWORD`

## Development Notes

- Game logic runs entirely in the Android WebView; Kotlin acts as a native shell
- `repair.py` is used to automate HTML inline-style fixes during development
- Vibration haptics and native Android features are accessed via a WebView-JavaScript bridge
- Game state is automatically saved and loaded between sessions
