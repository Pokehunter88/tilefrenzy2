import Phaser from 'phaser';

const COLS = 6;
const ROWS = 10;
const TILE = 20;
const BLOCK_TYPES = ['block1', 'block2', 'block3', 'block4', 'block5'];
const SCROLL_SPEED = 8; // pixels per second

const BOARD_X = Math.floor((430 - COLS * TILE) / 2);
const BOARD_Y = Math.floor((220 - ROWS * TILE) / 2);

function makeRng(seed) {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function randomBlock(rng) {
    return BLOCK_TYPES[Math.floor(rng() * BLOCK_TYPES.length)];
}

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.rng = makeRng(Date.now());

        this.grid = [];
        for (let r = 0; r < ROWS + 2; r++) {
            this.grid[r] = Array(COLS).fill(null);
        }
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < COLS; c++) {
                this.grid[r][c] = { type: randomBlock(this.rng) };
            }
        }

        this.nextRow = Array.from({ length: COLS }, () => ({ type: randomBlock(this.rng) }));
        this.scrollOffset = 0;
        this.clearing = false;
        this.falling = false;
        this.cursorCol = 2;
        this.cursorRow = 3;

        // Container holds all tile sprites; apply mask to it
        this.tileContainer = this.add.container(0, 0);

        // Sprite pool: (ROWS + 1) rows * COLS cols
        this.spritePool = [];
        const totalSprites = (ROWS + 1) * COLS;
        for (let i = 0; i < totalSprites; i++) {
            const img = this.add.image(0, 0, 'block1')
                .setOrigin(0, 0)
                .setScale(1)
                .setVisible(false);
            this.tileContainer.add(img);
            this.spritePool.push(img);
        }

        // Cursor graphics (on top of container, no mask needed)
        this.cursorGfx = this.add.graphics();

        // Board border
        const borderGfx = this.add.graphics();
        borderGfx.lineStyle(3, 0xffffff, 1);
        borderGfx.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * TILE + 4, ROWS * TILE + 4);

        // Score
        this.score = 0;
        this.scoreText = this.add.text(BOARD_X + COLS * TILE + 8, BOARD_Y, 'SCORE\n0', {
            fontFamily: 'monospace', fontSize: 8, color: '#ffffff', align: 'center'
        });

        const kb = this.input.keyboard;
        kb.on('keydown-UP',    () => this.moveCursor(0, 1));
        kb.on('keydown-DOWN',  () => this.moveCursor(0, -1));
        kb.on('keydown-LEFT',  () => this.moveCursor(-1, 0));
        kb.on('keydown-RIGHT', () => this.moveCursor(1, 0));
        kb.on('keydown-W',    () => this.moveCursor(0, 1));
        kb.on('keydown-S',  () => this.moveCursor(0, -1));
        kb.on('keydown-A',  () => this.moveCursor(-1, 0));
        kb.on('keydown-D', () => this.moveCursor(1, 0));
        kb.on('keydown-SPACE',     () => this.doSwap());
        kb.on('keydown-Z',     () => this.doSwap());
        kb.on('keydown-X',     () => { this.scrollOffset += TILE; });

        this.drawBoard();
        this.checkMatches();
    }

    moveCursor(dc, dr) {
        this.cursorCol = Phaser.Math.Clamp(this.cursorCol + dc, 0, COLS - 2);
        this.cursorRow = Phaser.Math.Clamp(this.cursorRow + dr, 0, ROWS - 1);
    }

    doSwap() {
        if (this.clearing || this.falling) return;
        const r = this.cursorRow;
        const c = this.cursorCol;
        const tmp = this.grid[r][c];
        this.grid[r][c] = this.grid[r][c + 1];
        this.grid[r][c + 1] = tmp;
        this.startGravity(() => this.checkMatches());
    }

    // Returns true if any block moved down one row
    gravityStep(dontMove) {
        let moved = false;
        // Iterate from row 1 upward so blocks cascade naturally
        for (let r = 1; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.grid[r][c] && !this.grid[r - 1][c]) {
                    if (dontMove) return true;
                    this.grid[r - 1][c] = this.grid[r][c];
                    this.grid[r][c] = null;
                    moved = true;
                }
            }
        }
        return moved;
    }

    startGravity(onDone) {
        if (!this.gravityStep(true)) { onDone(); return; }
        this.falling = true;
        this.drawBoard();
        const step = () => {
            if (this.gravityStep()) {
                this.drawBoard();
                this.time.delayedCall(30, step);
            } else {
                this.falling = false;
                this.drawBoard();
                onDone();
            }
        };
        this.time.delayedCall(100, step);
    }

    scrollBoard(delta) {
        this.scrollOffset += delta;
        while (this.scrollOffset >= TILE) {
            this.scrollOffset -= TILE;
            this.shiftGridUp();
        }
    }

    shiftGridUp() {
        for (let r = ROWS; r > 0; r--) {
            this.grid[r] = this.grid[r - 1];
        }
        this.grid[0] = this.nextRow;
        this.nextRow = Array.from({ length: COLS }, () => ({ type: randomBlock(this.rng) }));
        if (this.cursorRow < ROWS - 1) this.cursorRow++;
        if (!this.clearing) this.checkMatches();
    }

    checkMatches() {
        const toRemove = new Set();

        for (let r = 0; r < ROWS; r++) {
            let run = 1;
            for (let c = 1; c < COLS; c++) {
                const a = this.grid[r][c - 1], b = this.grid[r][c];
                if (a && b && a.type === b.type) { run++; }
                else {
                    if (run >= 3) for (let i = c - run; i < c; i++) toRemove.add(`${r},${i}`);
                    run = 1;
                }
            }
            if (run >= 3) for (let i = COLS - run; i < COLS; i++) toRemove.add(`${r},${i}`);
        }

        for (let c = 0; c < COLS; c++) {
            let run = 1;
            for (let r = 1; r < ROWS; r++) {
                const a = this.grid[r - 1][c], b = this.grid[r][c];
                if (a && b && a.type === b.type) { run++; }
                else {
                    if (run >= 3) for (let i = r - run; i < r; i++) toRemove.add(`${i},${c}`);
                    run = 1;
                }
            }
            if (run >= 3) for (let i = ROWS - run; i < ROWS; i++) toRemove.add(`${i},${c}`);
        }

        if (toRemove.size === 0) return;

        this.clearing = true;

        let scoreToAdd = 0;

        if (toRemove.size == 4) {
            scoreToAdd = 20;
        } else if (toRemove.size == 5) {
            scoreToAdd = 40;
        } else if (toRemove.size == 6) {
            scoreToAdd = 50;
        }

        this.score += toRemove.size * 10 + scoreToAdd;

        this.scoreText.setText(`SCORE\n${this.score}`);

        const flashKeys = [...toRemove];

        // Mark all as flashing
        flashKeys.forEach(key => {
            const [r, c] = key.split(',').map(Number);
            if (this.grid[r][c]) this.grid[r][c]._flash = true;
        });
        this.drawBoard();

        // Flicker phase
        let flashOn = true;
        let ticks = 0;
        const totalTicks = 8;

        const doFlash = () => {
            flashOn = !flashOn;
            ticks++;
            flashKeys.forEach(key => {
                const [r, c] = key.split(',').map(Number);
                if (this.grid[r][c]) this.grid[r][c]._flash = flashOn;
            });
            this.drawBoard();
            if (ticks < totalTicks) {
                this.time.delayedCall(50, doFlash);
            } else {
                // Make sure all are flashing white before pop phase
                flashKeys.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    if (this.grid[r][c]) this.grid[r][c]._flash = true;
                });
                this.drawBoard();
                this.time.delayedCall(100, doPopping);
            }
        };

        // Pop phase — remove one block at a time
        const doPopping = () => {
            if (flashKeys.length === 0) {
                this.clearing = false;
                this.startGravity(() => this.checkMatches());
                return;
            }
            const key = flashKeys.shift();
            const [r, c] = key.split(',').map(Number);
            this.grid[r][c] = null;
            this.drawBoard();
            this.time.delayedCall(100, doPopping);
        };

        doFlash();
    }

    drawBoard() {
        const off = this.scrollOffset;
        const boardTop = BOARD_Y;
        const boardBottom = BOARD_Y + ROWS * TILE;
        let spriteIdx = 0;

        const place = (img, px, py, type, flash) => {
            if (py >= boardBottom || py + TILE <= boardTop) {
                img.setVisible(false);
                return;
            }
            const cropY = Math.max(0, boardTop - py);
            const cropH = Math.min(TILE, boardBottom - py) - cropY;
            const croppedBottom = py + TILE > boardBottom;
            img.setTexture(type);
            img.setCrop(0, cropY, TILE, cropH);
            img.setPosition(px, py).setVisible(true);
            if (flash) {
                img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
            }
            else if (croppedBottom) { img.setTint(0x555555); }
            else { img.clearTint(); }
        };

        // Next (peek) row at the bottom
        for (let c = 0; c < COLS; c++) {
            const tile = this.nextRow[c];
            const px = BOARD_X + c * TILE;
            const py = BOARD_Y + ROWS * TILE - off;
            place(this.spritePool[spriteIdx++], px, py, tile.type, false);
        }

        // Grid rows
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tile = this.grid[r][c];
                const img = this.spritePool[spriteIdx++];
                if (!tile) { img.setVisible(false); continue; }
                const px = BOARD_X + c * TILE;
                const py = BOARD_Y + (ROWS - 1 - r) * TILE - off;
                place(img, px, py, tile.type, tile._flash);
            }
        }

        // Hide any remaining pooled sprites
        for (; spriteIdx < this.spritePool.length; spriteIdx++) {
            this.spritePool[spriteIdx].setVisible(false);
        }

        // Cursor
        const cur = this.cursorGfx;
        cur.clear();
        const cx = BOARD_X + this.cursorCol * TILE;
        const cy = BOARD_Y + (ROWS - 1 - this.cursorRow) * TILE - off;
        if (cy >= boardTop && cy + TILE <= boardBottom) {
            cur.lineStyle(3, 0xffffff, 1);
            cur.strokeRect(cx + 1, cy + 1, TILE * 2 - 2, TILE - 2);
        }
    }

    update(_time, delta) {
        if (this.clearing || this.falling) return;
        this.scrollBoard((SCROLL_SPEED / 1000) * delta);
        this.drawBoard();
    }
}
