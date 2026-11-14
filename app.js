// Constants

const MENU_WIDTH = 640;
const MENU_HEIGHT = 720;

const UI_HEIGHT = 100;
const TOP_UI_HEIGHT = 130;

const BTN_WIDTH = 280;
const BTN_HEIGHT = 80;

const LONG_PRESS_MS = 400; // Touch screens: hold this long to place a flag

const STORAGE_KEY = 'minesweeperBeaten';
const SETTINGS_KEY = 'minesweeperSettings';

const GITHUB_URL = 'https://github.com/cosminelulul';

// Grid size, mine count, cell size (in pixels) and score timings for each difficulty
// multiplierTimes: the second at which each multiplier tier ends (see MULTIPLIER_TIERS)

const DIFFICULTIES = {
    easy: {
        label: 'EASY', rows: 9, cols: 9, mines: 10, cellSize: 64, color: '#50fa7b',
        multiplierTimes: [5, 12, 22, 35, 50]
    },
    medium: {
        label: 'MEDIUM', rows: 16, cols: 16, mines: 40, cellSize: 38, color: '#ffb86c',
        multiplierTimes: [15, 40, 75, 120, 180]
    },
    hard: {
        label: 'HARD', rows: 16, cols: 30, mines: 99, cellSize: 32, color: '#ff5555',
        multiplierTimes: [30, 80, 150, 240, 360]
    },
    impossible: {
        label: 'IMPOSSIBLE', rows: 24, cols: 40, mines: 250, cellSize: 28, color: '#bd93f9',
        multiplierTimes: [60, 160, 300, 480, 720]
    }
};

// These three must be beaten to unlock Impossible
const REQUIRED_DIFFICULTIES = ['easy', 'medium', 'hard'];

// Scoring: every revealed tile is worth BASE_SCORE x the current multiplier.
// The multiplier starts at 5.0x and steps down by 0.8 until it hits the 1.0x floor
const BASE_SCORE = 100;

const MULTIPLIER_TIERS = [5.0, 4.2, 3.4, 2.6, 1.8, 1.0];

const MULTIPLIER_COLORS = [
    '#ffd700', // 5.0x: Gold
    '#f1fa8c', // 4.2x: Pastel Yellow
    '#50fa7b', // 3.4x: Pastel Green
    '#8be9fd', // 2.6x: Pastel Blue
    '#aaaaaa', // 1.8x: Light Grey
    '#777777'  // 1.0x: Grey
];

const NUMBER_COLORS = [
    '',        
    '#8be9fd', // 1: Pastel Blue
    '#ffb86c', // 2: Pastel Orange/Peach
    '#50fa7b', // 3: Pastel Green
    '#ff79c6', // 4: Pastel Pink
    '#bd93f9', // 5: Pastel Purple
    '#f1fa8c', // 6: Pastel Yellow
    '#ff5555', // 7: Pastel Red
    '#f8f8f2'  // 8: White
];

// ------------------------------------- //

// Global Variables

let settings = { muted: false, animations: true };

// ------------------------------------- //

// Saved Progress (localStorage)

// The try/catch is there because some browsers block localStorage (private mode, etc.)

function getBeatenDifficulties() {
    try {
        let saved = localStorage.getItem(STORAGE_KEY);

        if (saved) return JSON.parse(saved);
    } catch (error) {
        console.log("Could not read saved progress.");
    }

    return [];
}

function saveBeatenDifficulty(difficultyKey) {
    let beaten = getBeatenDifficulties();

    if (beaten.includes(difficultyKey)) return;

    beaten.push(difficultyKey);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(beaten));
    } catch (error) {
        console.log("Could not save progress.");
    }
}

function isImpossibleUnlocked() {
    let beaten = getBeatenDifficulties();

    for (let i = 0; i < REQUIRED_DIFFICULTIES.length; i++) {
        if (!beaten.includes(REQUIRED_DIFFICULTIES[i])) return false;
    }

    return true;
}

// Saved Settings (mute / animations)

function loadSettings() {
    try {
        let saved = localStorage.getItem(SETTINGS_KEY);

        if (saved) settings = Object.assign(settings, JSON.parse(saved));
    } catch (error) {
        console.log("Could not read saved settings.");
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.log("Could not save settings.");
    }
}

// ------------------------------------- //

// Shared Helpers

function playSound(scene, soundKey) {
    scene.sound.play(soundKey, { volume: 0.6 });
}

// Sizes the canvas for the current screen. It only ever scales DOWN to fit the window,
// never up, because stretching the canvas past its real size is what makes text blurry

function resizeGame(scene, width, height) {
    scene.scale.displaySize.setAspectRatio(width / height);
    scene.scale.displaySize.setMax(width, height);
    scene.scale.resize(width, height);
    scene.scale.refresh();
}

// Quick fade in whenever a screen opens

function fadeInScene(scene) {
    scene.isLeaving = false;

    if (settings.animations) scene.cameras.main.fadeIn(250, 27, 27, 27);
}

// Quick fade out, then switch screens (works for restarting the same screen too)

function changeScene(scene, sceneKey, data) {

    // Ignore extra clicks while a fade is already happening
    if (scene.isLeaving) return;
    scene.isLeaving = true;

    if (!settings.animations) {
        scene.scene.start(sceneKey, data);
        return;
    }

    scene.cameras.main.fadeOut(180, 27, 27, 27);
    scene.cameras.main.once('camerafadeoutcomplete', () => {
        scene.scene.start(sceneKey, data);
    });
}

// Fades something in (optionally sliding up from slideY pixels away)

function fadeInObject(scene, object, delay, slideY) {
    if (!settings.animations) return;

    let endY = object.y;

    object.setAlpha(0);
    object.y = endY + (slideY || 0);

    scene.tweens.add({
        targets: object,
        alpha: 1,
        y: endY,
        duration: 300,
        delay: delay || 0,
        ease: 'Cubic.easeOut'
    });
}

// Draws a clickable button. "options" is optional:
// width, height, fontSize, detail (small second line), fadeDelay (fade in after this many ms)
// Returns the button so its label can be changed later (button.label.setText(...))

function createButton(scene, x, y, label, textColor, onClick, options) {
    options = options || {};

    let width = options.width || BTN_WIDTH;
    let height = options.height || BTN_HEIGHT;
    let fontSize = options.fontSize || 36;

    let button = scene.add.container(x, y);

    let rect = scene.add.rectangle(0, 0, width, height, 0x444444);
    rect.setInteractive({ useHandCursor: true });

    // Buttons with a detail line push the label up a little to make room
    let labelY = options.detail ? -12 : 0;

    let labelText = scene.add.text(0, labelY, label, {
        fontSize: fontSize + 'px',
        color: textColor,
        fontStyle: 'bold'
    }).setOrigin(0.5);

    button.add([rect, labelText]);
    button.label = labelText;

    if (options.detail) {
        let detailText = scene.add.text(0, 24, options.detail, {
            fontSize: '18px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        button.add(detailText);
    }

    // Hover: lighter color and a tiny grow
    rect.on('pointerover', () => {
        rect.fillColor = 0x666666;
        growButton(scene, button, 1.05);
    });

    rect.on('pointerout', () => {
        rect.fillColor = 0x444444;
        growButton(scene, button, 1);
    });

    rect.on('pointerdown', () => {
        playSound(scene, 'click');
        onClick();
    });

    if (options.fadeDelay !== undefined) fadeInObject(scene, button, options.fadeDelay, 14);

    return button;
}

function growButton(scene, button, scale) {
    if (!settings.animations) return;

    if (button.growTween) button.growTween.stop();

    button.growTween = scene.tweens.add({
        targets: button,
        scale: scale,
        duration: 90
    });
}

// ------------------------------------- //

// Start the game once every script has loaded

function startGame() {
    loadSettings();

    const config = {
        type: Phaser.AUTO,
        parent: 'game',
        width: MENU_WIDTH,
        height: MENU_HEIGHT,
        backgroundColor: '#1B1B1B',
        render: { roundPixels: true },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [
            { key: 'BootScene',       preload: preloadAssets,  create: createBootScene },
            { key: 'MenuScene',       create: createMenuScene },
            { key: 'SettingsScene',   create: createSettingsScene },
            { key: 'DifficultyScene', create: createDifficultyScene },
            { key: 'GameScene',       create: createGameScene }
        ]
    };

    new Phaser.Game(config);

    console.log("%cPsst... the kitchen is open. Try ordering something by name. \uD83C\uDF70", 'color: #ff79c6; font-size: 14px;');
}

window.addEventListener('load', startGame);
