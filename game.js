// Global Variables

// These get set from the chosen difficulty when a game starts
let ROWS = 9;
let COLS = 9;
let TOTAL_MINES = 10;
let CELL_SIZE = 80;

let gameWidth = MENU_WIDTH;
let gridOffsetX = 0;

let isGameOver = false;
let board = [];

let flagsPlaced = 0;
let counterText;
let isFirstClick = true;
let statusText;

let timerSeconds = 0;
let timerText;
let timerEvent;
let mainScene;

let longPressTimer = null;
let longPressTriggered = false;

let score = 0;
let scoreText;
let multiplierText;

let winPopupObjects = [];

// Secret stuff, shhh
let activeCheat = null; // null, 'xray' or 'autocomplete'
let cheatsUsed = false;
let autoCompleteEvent = null;

// ------------------------------------- //

// Functions

function createCell(row, col) {
    return {
        row: row,
        col: col,
        isMine: false,
        isRevealed: false,
        isFlagged: false,
        neighborMines: 0
    };
}

function initializeBoard() {
    
    board = [];

    for ( let m = 0; m < ROWS; m++) {
        let newRow = [];

        for ( let n = 0; n < COLS; n++)  newRow.push(createCell(m, n));
        
        board.push(newRow);
    }

}

function plantMines(firstClickRow, firstClickCol) {
    let minesPlanted = 0;

    while (minesPlanted < TOTAL_MINES) {
        let randomRow = Math.floor(Math.random() * ROWS);
        let randomCol = Math.floor(Math.random() * COLS);

        // The first click and the 8 cells around it are always safe,
        // so your first click always opens up some space
        let isNearFirstClick = Math.abs(randomRow - firstClickRow) <= 1 &&
                               Math.abs(randomCol - firstClickCol) <= 1;

        if (board[randomRow][randomCol].isMine === false && !isNearFirstClick) {
            
            board[randomRow][randomCol].isMine = true;
            minesPlanted++;
        }
    }
}

function calculateNeighbors() {

    // Coordinates for the 8 neighboring cells

    const directions = [
        [-1, -1], [-1, 0], [-1, 1], // Top Left, Top, Top Right
        [0, -1],           [0, 1], // Left, Right
        [1, -1], [1, 0], [1, 1] // Bottom Left, Bottom, Bottom Right
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {

            // Cel is mine - skip
            if (board[row][col].isMine) continue;

            let mineCount = 0;

            // Check 

            for (let i = 0; i < directions.length; i++) {
                let neighborRow = row + directions[i][0];
                let neighborCol = col + directions[i][1];

                // Boundary check:

                if (neighborRow >= 0 && neighborRow < ROWS && neighborCol >= 0 && neighborCol < COLS) {
                    // Check if mine
                    if (board[neighborRow][neighborCol].isMine) mineCount++;
                    
                    }
                
            }

            board[row][col].neighborMines = mineCount;
        }

    }

}


// isPlayerClick is true for the cell the player clicked, and false for the
// cells opened automatically by the recursive reveal (so we only play one sound)

function revealCell(row, col, isPlayerClick = true) {
    if (isGameOver) return;
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    
    let cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;

    // --- FIRST CLICK SAFETY LOGIC ---
    if (isFirstClick) {
        plantMines(row, col); 
        calculateNeighbors(); 
        

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                let currentCell = board[r][c];
                
                // Mines are drawn with the bomb icon at game over, so only numbers need text
                if (!currentCell.isMine && currentCell.neighborMines > 0) {
                    currentCell.textSprite.setText(currentCell.neighborMines.toString());
                    currentCell.textSprite.setColor(NUMBER_COLORS[currentCell.neighborMines]);
                }
            }
        }

        timerEvent = mainScene.time.addEvent({
            delay: 1000,
            callback: updateTimer,
            loop: true
        });

        statusText.setText("Playing!");
        statusText.setColor("#bd93f9"); 

        isFirstClick = false; 

        // Mines only exist from now on, so X-Ray (if on) can finally show them
        refreshXRay();
    }

    cell.isRevealed = true;
    cell.sprite.fillColor = 0x2b2b2b; 
    if (cell.textSprite) cell.textSprite.setVisible(true);

    if (cell.isMine) {
        handleGameOver(cell);
        return; 
    }

    // Every safe tile is worth 100 x the current multiplier
    score += Math.round(BASE_SCORE * getMultiplier());
    updateScoreDisplay();
    
    if (cell.neighborMines === 0) {
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [ 0, -1],          [ 0, 1],
            [ 1, -1], [ 1, 0], [ 1, 1]
        ];

        for (let i = 0; i < directions.length; i++) {
            let nextRow = row + directions[i][0];
            let nextCol = col + directions[i][1];
            revealCell(nextRow, nextCol, false);
        }
    }
    
    if (!isGameOver) checkWinCondition();

    // Click sound, unless that click just won the game (the win sound plays instead)
    if (isPlayerClick && !isGameOver) playSound(mainScene, 'click');
}

function toggleFlag(row, col) {
    if (isGameOver) return;

    let cell = board[row][col];

    if (cell.isRevealed) return;

    if (!cell.isFlagged && flagsPlaced >= TOTAL_MINES) {
        return; 
    }

    cell.isFlagged = !cell.isFlagged;
    cell.flagSprite.setVisible(cell.isFlagged);

    if (cell.isFlagged) {
        flagsPlaced++; 
    } else {
        flagsPlaced--; 
    }

    playSound(mainScene, 'click');

    if (counterText) {
        counterText.setText(`Mines: ${TOTAL_MINES - flagsPlaced}`);
    }

    // A flag covers the X-Ray bomb, taking it off shows it again
    refreshXRay();
}

function handleGameOver(clickedCell) {
    isGameOver = true;

    if (timerEvent) timerEvent.remove();

    playSound(mainScene, 'lose');

    if (statusText) {
        statusText.setText("You LOST!");
        statusText.setColor("#ff5555"); 
    }

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            let cell = board[row][col];
            
            if (cell.isMine && !cell.isFlagged) {

                cell.sprite.fillColor = 0xffcccc; 
                cell.bombSprite.setAlpha(1);
                cell.bombSprite.setVisible(true);

            } else if (!cell.isMine && cell.isFlagged) {

                // A flag on a safe cell - the player guessed wrong
                cell.sprite.fillColor = 0x8b2b2b;
            }
        }
    }

    // The mine that was actually clicked stands out in red
    clickedCell.sprite.fillColor = 0xff5555;
    clickedCell.bombSprite.setAlpha(1);
    clickedCell.bombSprite.setVisible(true);

    // A finished game ends any auto-complete in progress
    stopAutoComplete();
}

function checkWinCondition() {
    let safeCellsRevealed = 0;
    const totalSafeCells = (ROWS * COLS) - TOTAL_MINES;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col].isRevealed && !board[row][col].isMine) {
                safeCellsRevealed++;
            }
        }
    }

    if (safeCellsRevealed === totalSafeCells) {
        isGameOver = true;

        if (timerEvent) timerEvent.remove();

        playSound(mainScene, 'win');

        // Remember this win. If it was the last of the three, Impossible unlocks
        // (a win with cheats doesn't count)
        let unlockedNow = false;

        if (!cheatsUsed) {
            let wasUnlocked = isImpossibleUnlocked();
            saveBeatenDifficulty(currentDifficulty);

            unlockedNow = !wasUnlocked && isImpossibleUnlocked();
        }

        if (statusText) {
            statusText.setText("YOU WON!");
            statusText.setColor("#f1fa8c");
        }
        

        // Every mine gets a flag and a green tile
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (board[row][col].isMine) {
                    board[row][col].sprite.fillColor = 0x00ff00;
                    board[row][col].bombSprite.setVisible(false);
                    board[row][col].flagSprite.setVisible(true);
                }
            }
        }

        flagsPlaced = TOTAL_MINES;
        counterText.setText(`Mines: 0`);

        // A finished game ends any auto-complete in progress
        activeCheat = null;
        stopAutoComplete();

        // Short pause so you can see the board, then the score popup
        mainScene.time.delayedCall(700, () => showWinPopup(unlockedNow));
    }
}

function updateTimer() {
    if (!isGameOver) {
        timerSeconds++;
        timerText.setText(`Time: ${timerSeconds}s`);

        // The multiplier may have just stepped down
        updateScoreDisplay();
    } else {
        if (timerEvent) timerEvent.remove();
    }
}


// ------------------------------ //

// Score

// Which multiplier tier we are in, based on how many seconds have passed
function getMultiplierTier() {
    let tierEnds = DIFFICULTIES[currentDifficulty].multiplierTimes;

    for (let i = 0; i < tierEnds.length; i++) {
        if (timerSeconds < tierEnds[i]) return i;
    }

    // Past the last tier: the 1.0x floor
    return MULTIPLIER_TIERS.length - 1;
}

function getMultiplier() {
    return MULTIPLIER_TIERS[getMultiplierTier()];
}

function updateScoreDisplay() {
    if (!scoreText) return;

    scoreText.setText(`Score: ${score.toLocaleString('en-US')}`);

    multiplierText.setText(`Multiplier: x${getMultiplier().toFixed(1)}`);
    multiplierText.setColor(MULTIPLIER_COLORS[getMultiplierTier()]);
}

// Win popup: the score counts up from 0 to the final number

function showWinPopup(unlockedNow) {
    let centerX = gameWidth / 2;
    let centerY = (TOP_UI_HEIGHT + (ROWS * CELL_SIZE) + UI_HEIGHT) / 2;

    // Dark background that also stops clicks from reaching the board
    let overlay = mainScene.add.rectangle(centerX, centerY, gameWidth, centerY * 2, 0x000000, 0.6);
    overlay.setInteractive();
    overlay.setDepth(100);

    // Everything in the popup is positioned relative to the middle of the panel
    let popup = mainScene.add.container(centerX, centerY);
    popup.setDepth(101);

    let panel = mainScene.add.rectangle(0, 0, 460, 340, 0x2b2b2b);
    panel.setStrokeStyle(3, 0xbd93f9);

    let title = mainScene.add.text(0, -125, "YOU WON!", {
        fontSize: '42px',
        color: '#f1fa8c',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    let scoreLabel = mainScene.add.text(0, -72, "SCORE", {
        fontSize: '18px',
        color: '#aaaaaa'
    }).setOrigin(0.5);

    let scoreValue = mainScene.add.text(0, -28, "0", {
        fontSize: '60px',
        color: '#f8f8f2',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    let timeText = mainScene.add.text(0, 22, `Time: ${timerSeconds}s`, {
        fontSize: '20px',
        color: '#8be9fd'
    }).setOrigin(0.5);

    popup.add([panel, title, scoreLabel, scoreValue, timeText]);

    // One extra line when there is something special to say
    if (unlockedNow) {
        let unlockText = mainScene.add.text(0, 62, "IMPOSSIBLE UNLOCKED!", {
            fontSize: '24px',
            color: '#bd93f9',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        popup.add(unlockText);

    } else if (cheatsUsed) {
        let cheatText = mainScene.add.text(0, 62, "Cheats used - progress not saved", {
            fontSize: '16px',
            color: '#777777'
        }).setOrigin(0.5);

        popup.add(cheatText);
    }

    let againButton = createButton(mainScene, -100, 120, "AGAIN", '#81eb57', () => {
        changeScene(mainScene, 'GameScene', { difficulty: currentDifficulty });
    }, { width: 170, height: 56, fontSize: 26 });

    let menuButton = createButton(mainScene, 100, 120, "MENU", '#b06161', () => {
        changeScene(mainScene, 'DifficultyScene');
    }, { width: 170, height: 56, fontSize: 26 });

    // Small X in the corner, to look at the board again
    let closeButton = createButton(mainScene, 205, -150, "X", '#b06161', closeWinPopup, {
        width: 36, height: 36, fontSize: 20
    });

    popup.add([againButton, menuButton, closeButton]);

    winPopupObjects = [overlay, popup];

    // Pop in, then count the score up
    if (settings.animations) {
        popup.setScale(0.85);
        popup.setAlpha(0);
        overlay.setAlpha(0);

        mainScene.tweens.add({ targets: overlay, alpha: 1, duration: 200 });
        mainScene.tweens.add({ targets: popup, scale: 1, alpha: 1, duration: 250, ease: 'Back.easeOut' });

        mainScene.tweens.addCounter({
            from: 0,
            to: score,
            duration: 1800,
            delay: 250,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                scoreValue.setText(Math.floor(tween.getValue()).toLocaleString('en-US'));
            },
            onComplete: () => {
                scoreValue.setText(score.toLocaleString('en-US'));
            }
        });

    } else {
        scoreValue.setText(score.toLocaleString('en-US'));
    }
}

function closeWinPopup() {
    for (let i = 0; i < winPopupObjects.length; i++) winPopupObjects[i].destroy();

    winPopupObjects = [];
}


function createGameScene(data) {
    mainScene = this;
    this.input.mouse.disableContextMenu();

    // Pick the difficulty (falls back to Easy if none was passed in)
    currentDifficulty = (data && data.difficulty) ? data.difficulty : 'easy';

    let difficulty = DIFFICULTIES[currentDifficulty];

    ROWS = difficulty.rows;
    COLS = difficulty.cols;
    TOTAL_MINES = difficulty.mines;
    CELL_SIZE = difficulty.cellSize;

    // The canvas is sized to fit this difficulty's grid (never narrower than the menu)
    gameWidth = Math.max(MENU_WIDTH, COLS * CELL_SIZE);
    gridOffsetX = Math.floor((gameWidth - (COLS * CELL_SIZE)) / 2);

    resizeGame(this, gameWidth, TOP_UI_HEIGHT + (ROWS * CELL_SIZE) + UI_HEIGHT);
    fadeInScene(this);

    isGameOver = false; 
    isFirstClick = true; 
    flagsPlaced = 0;
    longPressTimer = null;
    longPressTriggered = false;

    score = 0;
    winPopupObjects = [];
    autoCompleteEvent = null;

    // A cheat that is still switched on from the last game counts as cheating
    cheatsUsed = (activeCheat !== null);


    initializeBoard();

    // The UI sits in a column the width of the menu, centered above the grid
    let uiLeft = Math.floor((gameWidth - MENU_WIDTH) / 2) + 20;
    let uiRight = gameWidth - uiLeft;

    statusText = this.add.text(gameWidth / 2, 40, "Click to Play", {
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            let xPos = gridOffsetX + (col * CELL_SIZE) + CELL_SIZE / 2;
            let yPos = (row * CELL_SIZE) + TOP_UI_HEIGHT + CELL_SIZE / 2;

            
            let visualRect = this.add.rectangle(xPos, yPos, CELL_SIZE - 4, CELL_SIZE - 4, 0x555555);
            visualRect.setInteractive();

            // Mouse: left click reveals, right click flags
            // Touch: tap reveals, holding flags (there is no right click on a phone)
            visualRect.on('pointerdown', function (pointer) {
                if (pointer.rightButtonDown()) {
                    toggleFlag(row, col);

                } else if (pointer.wasTouch) {
                    longPressTriggered = false;

                    longPressTimer = mainScene.time.delayedCall(LONG_PRESS_MS, function () {
                        longPressTriggered = true;
                        toggleFlag(row, col);
                    });

                } else {
                    revealCell(row, col);
                }
            });

            visualRect.on('pointerup', function (pointer) {
                if (!pointer.wasTouch) return;

                if (longPressTimer) longPressTimer.remove(false);
                longPressTimer = null;

                if (!longPressTriggered) revealCell(row, col);
            });

            // Finger slid off the cell - cancel the long press
            visualRect.on('pointerout', function (pointer) {
                if (longPressTimer) longPressTimer.remove(false);
                longPressTimer = null;
            });

            board[row][col].sprite = visualRect;


            let visualText = this.add.text(xPos, yPos, "", {
                fontSize: Math.floor(CELL_SIZE * 0.5) + 'px',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            visualText.setVisible(false);
            board[row][col].textSprite = visualText;


            // Icons start hidden. Flag shows when flagged, bomb shows at game over
            let iconSize = CELL_SIZE * 0.7;

            let flagIcon = this.add.image(xPos, yPos, 'flag').setDisplaySize(iconSize, iconSize);
            flagIcon.setVisible(false);
            board[row][col].flagSprite = flagIcon;

            let bombIcon = this.add.image(xPos, yPos, 'bomb').setDisplaySize(iconSize, iconSize);
            bombIcon.setVisible(false);
            board[row][col].bombSprite = bombIcon;
        }
    }

    timerSeconds = 0;
    if (timerEvent) timerEvent.remove();

    let btnX = gameWidth / 2;
    let btnY = TOP_UI_HEIGHT + (ROWS * CELL_SIZE) + (UI_HEIGHT / 2);

    createButton(this, btnX, btnY, "RESTART", '#b06161', () => {
        changeScene(this, 'GameScene', { difficulty: currentDifficulty });
    }, { width: 200, height: 64, fontSize: 30 });

    // Small menu button in the top left corner
    createButton(this, uiLeft + 55, 40, "MENU", '#b06161', () => {
        changeScene(this, 'DifficultyScene');
    }, { width: 110, height: 46, fontSize: 20 });

    
    counterText = this.add.text(uiLeft, btnY, `Mines: ${TOTAL_MINES - flagsPlaced}`, {
        fontSize: '28px',
        color: '#81eb57', 
        fontStyle: 'bold'
    }).setOrigin(0, 0.5); 

    timerText = this.add.text(uiRight, btnY, `Time: 0s`, {
        fontSize: '24px',
        color: '#8be9fd', 
        fontStyle: 'bold'
    }).setOrigin(1, 0.5); 

    // Score on the left, multiplier on the right, under the status text
    scoreText = this.add.text(uiLeft, 95, `Score: 0`, {
        fontSize: '28px',
        color: '#f8f8f2',
        fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    multiplierText = this.add.text(uiRight, 95, `Multiplier: x5.0`, {
        fontSize: '24px',
        color: MULTIPLIER_COLORS[0],
        fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    // If X-Ray or Auto-Complete is still switched on, pick it back up
    refreshXRay();
    if (activeCheat === 'autocomplete') startAutoComplete();

}


// ------------------------------ //

// Secret Menu (shhh)
// Open the browser console and place your order. Each cheat is a function:
//
//   vanillaCookies()    - X-Ray: shows where every mine is
//   chocolatePudding()  - Auto-Complete: the game plays itself to the win
//   redVelvet()         - turns off whichever cheat is on
//
// Only one cheat can be on at a time. A game won with cheats doesn't unlock anything.

function vanillaCookies() {
    setCheat('xray');
    console.log("%c\uD83C\uDF6A Vanilla Cookies, fresh out of the oven! X-Ray is on, the mines can't hide now.", 'color: #f3e5ab; font-weight: bold;');
}

function chocolatePudding() {
    setCheat('autocomplete');
    console.log("%c\uD83C\uDF6B Chocolate Pudding is served! Sit back, the game is playing itself.", 'color: #d2691e; font-weight: bold;');
}

function redVelvet() {
    setCheat(null);
    console.log("%c\uD83C\uDF70 Red Velvet, the palate cleanser. Back to playing fair.", 'color: #dc143c; font-weight: bold;');
}

function isGameSceneRunning() {
    return mainScene !== undefined && mainScene.scene.isActive('GameScene');
}

function setCheat(cheat) {

    // Out with the old cheat (only one at a time)
    stopAutoComplete();

    activeCheat = cheat;

    if (cheat !== null && isGameSceneRunning()) cheatsUsed = true;

    if (!isGameSceneRunning()) return;

    refreshXRay();
    if (cheat === 'autocomplete') startAutoComplete();
}

// X-Ray: unrevealed mines show up as faded bombs (until a flag covers them)

function refreshXRay() {
    if (!isGameSceneRunning() || isGameOver || isFirstClick) return;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            let cell = board[row][col];

            let showBomb = (activeCheat === 'xray') && cell.isMine && !cell.isRevealed && !cell.isFlagged;

            cell.bombSprite.setVisible(showBomb);
            if (showBomb) cell.bombSprite.setAlpha(0.4);
        }
    }
}

// Auto-Complete: a few safe tiles get revealed every moment until the game is won

function startAutoComplete() {
    if (!isGameSceneRunning() || isGameOver || autoCompleteEvent) return;

    autoCompleteEvent = mainScene.time.addEvent({
        delay: 30,
        callback: autoCompleteStep,
        loop: true
    });
}

function stopAutoComplete() {
    if (autoCompleteEvent) autoCompleteEvent.remove();

    autoCompleteEvent = null;
}

function autoCompleteStep() {
    if (isGameOver || activeCheat !== 'autocomplete') {
        stopAutoComplete();
        return;
    }

    // Nothing is on the board before the first click, so make one in the middle
    if (isFirstClick) {
        revealCell(Math.floor(ROWS / 2), Math.floor(COLS / 2), false);
        return;
    }

    let revealedThisStep = 0;

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            let cell = board[row][col];

            if (cell.isMine || cell.isRevealed) continue;

            // A safe tile with a flag on it has to be unflagged first
            if (cell.isFlagged) toggleFlag(row, col);

            revealCell(row, col, false);
            revealedThisStep++;

            if (isGameOver || revealedThisStep >= 4) return;
        }
    }
}
