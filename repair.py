import re

content = open('app/src/main/assets/space_ludo.html', 'r', encoding='utf-8').read()

replacement = """            .sl-title {
                font-size: 1.2rem;
                font-weight: 900;
                color: #a855f7;
                text-shadow: 0 0 10px rgba(168, 85, 247, 0.4);
                margin: 0;
            }
            .sl-subtitle {
                font-size: 0.65rem;
                color: #94a3b8;
                margin: 2px 0 0 0;
            }
            .sl-board-wrapper {
                position: relative;
                width: 100%;
                aspect-ratio: 1;
                background-image: url('images/rockets_and_wormholes_board.png');
                background-size: cover;
                background-position: center;
                border: 3px solid #00f2ff;
                border-radius: 18px;
                overflow: hidden;
                box-shadow: 0 0 35px rgba(0, 242, 255, 0.35);
            }
            .sl-pieces-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 3;
            }
            .sl-player-piece {
                position: absolute;
                width: 8%;
                height: 8%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.45rem;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
                transform: translate(-50%, -50%);
                z-index: 4;
            }
            .sl-bot-piece {
                position: absolute;
                width: 8%;
                height: 8%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
                transform: translate(-50%, -50%);
                filter: drop-shadow(0 0 6px rgb(59, 130, 246));
                z-index: 4;
            }
            .sl-control-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                background: rgba(0,0,0,0.4);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 12px;
                padding: 10px 14px;
                box-sizing: border-box;
                gap: 12px;
            }
            .sl-status {
                flex: 1;
                display: flex;
                flex-direction: column;
                text-align: left;
            }
            .sl-status-player {
                font-size: 0.72rem;
                font-weight: bold;
                color: #e2e8f0;
            }
            .sl-status-sub {
                font-size: 0.6rem;
                color: #a855f7;
                font-weight: bold;
            }
            .sl-dice-panel {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .sl-dice-visual {
                width: 42px;
                height: 42px;
                background: #1e1b4b;
                border: 2px solid #a855f7;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
                font-weight: 900;
                color: #fff;
                box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
                transition: transform 0.15s ease-out;
            }
            .sl-dice-rolling {
                animation: slDiceSpin 0.5s infinite linear;
            }
            @keyframes slDiceSpin {
                0% { transform: rotate(0deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1.1); }
            }
            .sl-roll-btn {
                background: linear-gradient(135deg, #a855f7, #6b21a8);
                border: 1px solid #c084fc;
                color: #fff;
                font-weight: 900;
                padding: 10px 16px;
                border-radius: 8px;
                font-size: 0.8rem;
                cursor: pointer;
                box-shadow: 0 4px 10px rgba(168,85,247,0.4);
                transition: all 0.2s;
            }
            .sl-roll-btn:disabled {
                opacity: 0.4;
                cursor: not-allowed;
                box-shadow: none;
            }
            .sl-back-btn {
                background: transparent;
                border: 1px solid rgba(255,255,255,0.25);
                color: rgba(255,255,255,0.6);
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.65rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            .sl-back-btn:hover {
                color: #fff;
                border-color: #fff;
            }
        </style>
        <style>
            /* ── Fullscreen Rockets & Wormholes layout ── */
            #snakes-ladders-view .sl-fs-back {
                position: fixed;
                top: 10px;
                left: 10px;
                z-index: 200;
                background: rgba(8,5,24,0.82);
                border: 1px solid rgba(168,85,247,0.35);
                color: rgba(255,255,255,0.75);
                padding: 6px 13px;
                border-radius: 20px;
                font-size: 0.65rem;
                font-family: 'Nunito', sans-serif;
                font-weight: 700;
                cursor: pointer;
                backdrop-filter: blur(6px);
                letter-spacing: 0.5px;
                transition: all 0.2s;
            }
            #snakes-ladders-view .sl-fs-back:hover,
            #snakes-ladders-view .sl-fs-back:active { color: #fff; border-color: #a855f7; }
            #snakes-ladders-view .sl-fs-reset {
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 200;
                background: rgba(8,5,24,0.82);
                border: 1px solid rgba(239,68,68,0.35);
                color: rgba(252,165,165,0.85);
                padding: 6px 13px;
                border-radius: 20px;
                font-size: 0.65rem;
                font-family: 'Nunito', sans-serif;
                font-weight: 700;
                cursor: pointer;
                backdrop-filter: blur(6px);
                transition: all 0.2s;
            }
            #snakes-ladders-view .sl-fs-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
                width: 100%;
                height: 100vh;
                padding: 50px 12px 10px 12px;
                box-sizing: border-box;
                gap: 8px;
                font-family: 'Nunito', sans-serif;
            }
            #snakes-ladders-view .sl-board-wrapper {
                position: relative;
                flex: 1;
                width: 100%;
                max-width: min(100%, calc(100vh - 160px));
                aspect-ratio: 1;
                background-image: url('images/rockets_and_wormholes_board.png');
                background-size: cover;
                background-position: center;
                border: 2px solid #581c87;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(88, 28, 135, 0.5);
            }
        </style>

        <!-- Floating back & reset buttons —  outside game area so they don't push layout -->
        <button type="button" class="sl-fs-back" onclick="navigateTo('home-screen'); switchTab('morefun');">◀ BACK TO HUB</button>
        <button type="button" class="sl-fs-reset" onclick="resetSAndLGame()"> REBOOT</button>

        <div class="sl-fs-body">
            <div class="sl-header" style="text-align:center; width:100%;">
                <h3 class="sl-title">🚀 ROCKETS &amp; WORMHOLES</h3>
                <p class="sl-subtitle">SIDESTEP TEMPORAL WORMHOLES AND RIDE ROCKET FIELDS TO REACH 100</p>
            </div>

            <div class="sl-board-wrapper">
                <div class="sl-pieces-container" id="sl-pieces-container">
                    <!-- Dynamic pieces will be generated here -->
                </div>
            </div>

            <div class="sl-control-bar" style="width:100%; max-width: min(100%, calc(100vh - 160px));">
                <div class="sl-status">
                    <span id="sl-status-text" class="sl-status-player">Your Turn! Space Cadet</span>
                    <span id="sl-status-detail" class="sl-status-sub">Ready to roll...</span>
                </div>
                <div class="sl-dice-panel">
                    <div id="sl-dice-view" class="sl-dice-visual">⚀</div>
                    <button type="button" id="sl-roll-btn" class="sl-roll-btn" onclick="rollSAndLDice()">ROLL</button>
                </div>
            </div>
        </div>
    </div>"""

pattern = r'\.sl-title\s*\{\s*font-size:\s*1\.2rem;.*?(?=<!-- 7\. STARSHIP LASER SHOOTER)'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('app/src/main/assets/space_ludo.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Success')
