// Global Variables

let currentDifficulty = 'easy';

// ------------------------------------- //

// Loading

function preloadAssets() {
    this.load.image('flag', 'assets/icons/flag.png');
    this.load.image('bomb', 'assets/icons/bomb.png');
    this.load.svg('github', 'assets/icons/github.svg', { width: 64, height: 64 });

    this.load.audio('click', 'assets/sounds/click.mp3');
    this.load.audio('win', 'assets/sounds/win.mp3');
    this.load.audio('lose', 'assets/sounds/lose.mp3');
}

function createBootScene() {

    // Apply the saved mute setting before anything can play
    this.sound.mute = settings.muted;

    this.scene.start('MenuScene');
}

// ------------------------------------- //

// Main Menu

function createMenuScene() {
    resizeGame(this, MENU_WIDTH, MENU_HEIGHT);
    this.input.mouse.disableContextMenu();
    fadeInScene(this);

    let centerX = MENU_WIDTH / 2;

    let title = this.add.text(centerX, 190, "MINESWEEPER", {
        fontSize: '76px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    let subtitle = this.add.text(centerX, 260, "made with Phaser", {
        fontSize: '24px',
        color: '#bd93f9'
    }).setOrigin(0.5);

    fadeInObject(this, title, 0, -20);
    fadeInObject(this, subtitle, 120, -10);

    createButton(this, centerX, 420, "PLAY", '#81eb57', () => {
        changeScene(this, 'DifficultyScene');
    }, { fadeDelay: 220 });

    createButton(this, centerX, 520, "SETTINGS", '#8be9fd', () => {
        changeScene(this, 'SettingsScene');
    }, { fadeDelay: 320 });
}

// ------------------------------------- //

// Settings

function createSettingsScene() {
    resizeGame(this, MENU_WIDTH, MENU_HEIGHT);
    this.input.mouse.disableContextMenu();
    fadeInScene(this);

    let centerX = MENU_WIDTH / 2;

    let title = this.add.text(centerX, 80, "SETTINGS", {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    fadeInObject(this, title, 0, -10);

    // --- Option buttons ---

    let soundButton = createButton(this, centerX, 170, "", '#ffffff', () => {
        settings.muted = !settings.muted;
        this.sound.mute = settings.muted;
        saveSettings();
        refreshSettingsLabels();
    }, { width: 380, height: 70, fontSize: 28, fadeDelay: 80 });

    let animationsButton = createButton(this, centerX, 260, "", '#ffffff', () => {
        settings.animations = !settings.animations;
        saveSettings();
        refreshSettingsLabels();
    }, { width: 380, height: 70, fontSize: 28, fadeDelay: 160 });

    // Green when it is on, red when it is off
    function refreshSettingsLabels() {
        let soundOn = !settings.muted;

        soundButton.label.setText(soundOn ? "SOUND: ON" : "SOUND: OFF");
        soundButton.label.setColor(soundOn ? '#50fa7b' : '#ff5555');

        animationsButton.label.setText(settings.animations ? "ANIMATIONS: ON" : "ANIMATIONS: OFF");
        animationsButton.label.setColor(settings.animations ? '#50fa7b' : '#ff5555');
    }

    refreshSettingsLabels();

    // --- Sweet tooth section ---

    let vanilla = '#f3e5ab';   // Vanilla
    let chocolate = '#d2691e'; // HTML "chocolate"
    let velvet = '#dc143c';    // HTML "crimson"
    let plain = '#cccccc';

    let sweetsPanel = this.add.rectangle(centerX, 410, 520, 150, 0x242424);
    sweetsPanel.setStrokeStyle(2, 0x444444);

    let sweetsLines = [];

    sweetsLines.push(addColoredLine(this, centerX, 363, [
        { text: "Hmmm, today I'm craving some sweets.", color: plain }
    ], 20));

    sweetsLines.push(addColoredLine(this, centerX, 393, [
        { text: "What should I choose between", color: plain }
    ], 20));

    sweetsLines.push(addColoredLine(this, centerX, 423, [
        { text: "Red Velvet", color: velvet },
        { text: ", ", color: plain },
        { text: "Chocolate Pudding", color: chocolate }
    ], 20));

    sweetsLines.push(addColoredLine(this, centerX, 453, [
        { text: "or ", color: plain },
        { text: "Vanilla Cookies", color: vanilla },
        { text: "?", color: plain }
    ], 20));

    fadeInObject(this, sweetsPanel, 240, 10);

    for (let i = 0; i < sweetsLines.length; i++) {
        for (let j = 0; j < sweetsLines[i].length; j++) {
            fadeInObject(this, sweetsLines[i][j], 280 + (i * 60), 10);
        }
    }

    // --- GitHub section ---

    let githubPanel = this.add.rectangle(centerX, 540, 400, 60, 0x242424);
    githubPanel.setStrokeStyle(2, 0x444444);

    let githubLogo = this.add.image(centerX - 150, 540, 'github').setDisplaySize(32, 32);

    let githubLink = this.add.text(centerX - 115, 540, "github.com/cosminelulul", {
        fontSize: '20px',
        color: '#8be9fd'
    }).setOrigin(0, 0.5);

    let githubUnderline = this.add.rectangle(githubLink.x, 553, githubLink.width, 2, 0x8be9fd).setOrigin(0, 0.5);

    githubLink.setInteractive({ useHandCursor: true });

    githubLink.on('pointerover', () => {
        githubLink.setColor('#ffffff');
        githubUnderline.fillColor = 0xffffff;
    });

    githubLink.on('pointerout', () => {
        githubLink.setColor('#8be9fd');
        githubUnderline.fillColor = 0x8be9fd;
    });

    // Opens on pointerup, because browsers only allow new tabs from a real click or tap
    githubLink.on('pointerup', () => {
        window.open(GITHUB_URL, '_blank', 'noopener');
    });

    fadeInObject(this, githubPanel, 560, 10);
    fadeInObject(this, githubLogo, 600, 10);
    fadeInObject(this, githubLink, 600, 10);
    fadeInObject(this, githubUnderline, 600, 10);

    createButton(this, centerX, 650, "BACK", '#b06161', () => {
        changeScene(this, 'MenuScene');
    }, { width: 180, height: 60, fontSize: 28, fadeDelay: 660 });
}

// One line of text where each piece can have its own color. Returns the pieces

function addColoredLine(scene, centerX, y, parts, fontSize) {
    let pieces = [];
    let totalWidth = 0;

    for (let i = 0; i < parts.length; i++) {
        let piece = scene.add.text(0, y, parts[i].text, {
            fontSize: fontSize + 'px',
            color: parts[i].color
        }).setOrigin(0, 0.5);

        pieces.push(piece);
        totalWidth += piece.width;
    }

    // Line the pieces up side by side, centered as a whole
    let nextX = centerX - (totalWidth / 2);

    for (let i = 0; i < pieces.length; i++) {
        pieces[i].x = Math.round(nextX);
        nextX += pieces[i].width;
    }

    return pieces;
}

// ------------------------------------- //

// Difficulty Select

function createDifficultyScene() {
    resizeGame(this, MENU_WIDTH, MENU_HEIGHT);
    this.input.mouse.disableContextMenu();
    fadeInScene(this);

    let centerX = MENU_WIDTH / 2;

    let title = this.add.text(centerX, 100, "SELECT DIFFICULTY", {
        fontSize: '44px',
        color: '#ffffff',
        fontStyle: 'bold'
    }).setOrigin(0.5);

    fadeInObject(this, title, 0, -10);

    // Easy, Medium, Hard are always there. Impossible only shows up once unlocked
    let keys = ['easy', 'medium', 'hard'];

    if (isImpossibleUnlocked()) keys.push('impossible');

    let beaten = getBeatenDifficulties();

    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let difficulty = DIFFICULTIES[key];

        let detail = `${difficulty.cols} x ${difficulty.rows}  -  ${difficulty.mines} mines`;

        // A little checkmark on the ones already beaten
        let label = beaten.includes(key) ? difficulty.label + " \u2713" : difficulty.label;

        createButton(this, centerX, 230 + (i * 100), label, difficulty.color, () => {
            changeScene(this, 'GameScene', { difficulty: key });
        }, { detail: detail, fadeDelay: 100 + (i * 90) });
    }

    createButton(this, centerX, 650, "BACK", '#b06161', () => {
        changeScene(this, 'MenuScene');
    }, { width: 180, height: 60, fontSize: 28, fadeDelay: 100 + (keys.length * 90) });
}
