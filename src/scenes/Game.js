import Phaser from 'phaser';

const COLS = 6;
const ROWS = 12;          // visible rows
const TILE = 48;
const COLORS = [0xe74c3c, 0x2ecc71, 0x3498db, 0xf1c40f, 0x9b59b6, 0x1abc9c];
const SCROLL_SPEED = 20;  // pixels per second
const NEXT_ROW_SEED = 42;

// Board origin (top-left of the visible grid)
const BOARD_X = 1024 / 2 - (COLS * TILE) / 2;
const BOARD_Y = 768 / 2 - (ROWS * TILE) / 2;

function randomColor(rng) {
    return COLORS[Math.floor(rng() * COLORS.length)];
}

// Simple seeded RNG (mulberry32)
function makeRng(seed) {
    let s = seed;
    return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.rng = makeRng(Date.now());

        // grid[row][col] = { color } or null.  row 0 = bottom
        this.grid = [];
        for (let r = 0; r < ROWS + 2; r++) {
            this.grid[r] = Array(COLS).fill(null);
        }

        // Pre-fill bottom 6 rows
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < COLS; c++) {
                this.grid[r][c] = { color: randomColor(this.rng) };
            }
        }

        // Next row (hidden below board)
        this.nextRow = Array.from({ length: COLS }, () => ({ color: randomColor(this.rng) }));

        // Pixel scroll offset (0 = aligned, TILE = one row scrolled up)
        this.scrollOffset = 0;
        this.paused = false;
        this.clearing = false;      // lock swaps during clear animation

        // Cursor position (col = left of pair, row from bottom)
        this.cursorCol = 2;
        this.cursorRow = 3;

        // Graphics containers
        this.tileGraphics = this.add.graphics();
        this.cursorGfx = this.add.graphics();

        // Score
        this.score = 0;
        this.scoreText = this.add.text(BOARD_X + COLS * TILE + 20, BOARD_Y, 'SCORE\n0', {
            fontFamily: 'monospace', fontSize: 22, color: '#ffffff', align: 'center'
        });

        // Input
        const kb = this.input.keyboard;
        this.keys = kb.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.UP,
            down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
            left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
            right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
            swap:  Phaser.Input.Keyboard.KeyCodes.Z,
            raise: Phaser.Input.Keyboard.KeyCodes.X,
        });

        kb.on('keydown-UP',    () => this.moveCursor(0, 1));
        kb.on('keydown-DOWN',  () => this.moveCursor(0, -1));
        kb.on('keydown-LEFT',  () => this.moveCursor(-1, 0));
        kb.on('keydown-RIGHT', () => this.moveCursor(1, 0));
        kb.on('keydown-Z',     () => this.doSwap());
        kb.on('keydown-X',     () => { this.scrollOffset += TILE; });

        // Instructions
        this.add.text(BOARD_X, BOARD_Y + ROWS * TILE + 8,
            'Arrows: move  Z: swap  X: raise',
            { fontFamily: 'monospace', fontSize: 14, color: '#aaaaaa' }
        );

        this.drawBoard();
    }

    moveCursor(dc, dr) {
        this.cursorCol = Phaser.Math.Clamp(this.cursorCol + dc, 0, COLS - 2);
        this.cursorRow = Phaser.Math.Clamp(this.cursorRow + dr, 0, ROWS - 1);
    }

    doSwap() {
        if (this.clearing) return;
        const r = this.cursorRow;
        const c = this.cursorCol;
        const tmp = this.grid[r][c];
        this.grid[r][c] = this.grid[r][c + 1];
        this.grid[r][c + 1] = tmp;
        this.checkMatches();
    }

    // Scroll the board up by delta pixels; when a full tile is scrolled, shift grid
    scrollBoard(delta) {
        this.scrollOffset += delta;
        while (this.scrollOffset >= TILE) {
            this.scrollOffset -= TILE;
            this.shiftGridUp();
        }
    }

    shiftGridUp() {
        // Move every row up by one index (row 0 disappears off top is wrong —
        // in Tetris Attack rows rise from the bottom, so we push a new bottom row)
        // Shift all rows up by one slot
        for (let r = ROWS; r > 0; r--) {
            this.grid[r] = this.grid[r - 1];
        }
        // Insert the prepared next row at the bottom
        this.grid[0] = this.nextRow;
        // Generate a fresh next row
        this.nextRow = Array.from({ length: COLS }, () => ({ color: randomColor(this.rng) }));
        // Push cursor up too so it stays in the same visual spot
        if (this.cursorRow < ROWS - 1) this.cursorRow++;
    }

    checkMatches() {
        const toRemove = new Set();

        // Horizontal runs
        for (let r = 0; r < ROWS; r++) {
            let run = 1;
            for (let c = 1; c < COLS; c++) {
                const a = this.grid[r][c - 1];
                const b = this.grid[r][c];
                if (a && b && a.color === b.color) {
                    run++;
                } else {
                    if (run >= 3) for (let i = c - run; i < c; i++) toRemove.add(`${r},${i}`);
                    run = 1;
                }
            }
            if (run >= 3) for (let i = COLS - run; i < COLS; i++) toRemove.add(`${r},${i}`);
        }

        // Vertical runs
        for (let c = 0; c < COLS; c++) {
            let run = 1;
            for (let r = 1; r < ROWS; r++) {
                const a = this.grid[r - 1][c];
                const b = this.grid[r][c];
                if (a && b && a.color === b.color) {
                    run++;
                } else {
                    if (run >= 3) for (let i = r - run; i < r; i++) toRemove.add(`${i},${c}`);
                    run = 1;
                }
            }
            if (run >= 3) for (let i = ROWS - run; i < ROWS; i++) toRemove.add(`${i},${c}`);
        }

        if (toRemove.size === 0) return;

        this.clearing = true;
        this.score += toRemove.size * 10;
        this.scoreText.setText(`SCORE\n${this.score}`);

        // Flash cleared tiles then remove
        const flashKeys = [...toRemove];
        let flashCount = 0;
        const flashTimer = this.time.addEvent({
            delay: 80,
            repeat: 5,
            callback: () => {
                flashCount++;
                flashKeys.forEach(key => {
                    const [r, c] = key.split(',').map(Number);
                    if (this.grid[r][c]) this.grid[r][c]._flash = flashCount % 2 === 0;
                });
                this.drawBoard();
                if (flashCount >= 6) {
                    flashTimer.remove();
                    flashKeys.forEach(key => {
                        const [r, c] = key.split(',').map(Number);
                        this.grid[r][c] = null;
                    });
                    this.clearing = false;
                    this.drawBoard();
                }
            }
        });
    }

    drawBoard() {
        const gfx = this.tileGraphics;
        gfx.clear();

        const off = this.scrollOffset;

        // Draw next (hidden) row peeking from bottom
        for (let c = 0; c < COLS; c++) {
            const tile = this.nextRow[c];
            if (!tile) continue;
            const px = BOARD_X + c * TILE;
            const py = BOARD_Y + ROWS * TILE - off;
            this.drawTile(gfx, px, py, tile.color, false);
        }

        // Draw visible grid rows (row 0 = bottom visual row)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tile = this.grid[r][c];
                if (!tile) continue;
                const px = BOARD_X + c * TILE;
                // Visual y: row 0 is at the bottom
                const py = BOARD_Y + (ROWS - 1 - r) * TILE - off;
                if (py + TILE <= BOARD_Y) continue; // clipped above board
                this.drawTile(gfx, px, py, tile.color, tile._flash);
            }
        }

        // Board border
        gfx.lineStyle(3, 0xffffff, 0.6);
        gfx.strokeRect(BOARD_X - 2, BOARD_Y - 2, COLS * TILE + 4, ROWS * TILE + 4);

        // Cursor
        const cur = this.cursorGfx;
        cur.clear();
        const cx = BOARD_X + this.cursorCol * TILE;
        const cy = BOARD_Y + (ROWS - 1 - this.cursorRow) * TILE - off;
        cur.lineStyle(3, 0xffffff, 1);
        cur.strokeRect(cx + 1, cy + 1, TILE * 2 - 2, TILE - 2);
    }

    drawTile(gfx, px, py, color, flash) {
        const fill = flash ? 0xffffff : color;
        gfx.fillStyle(fill, 1);
        gfx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        // border
        gfx.lineStyle(2, 0x000000, 0.4);
        gfx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        // shine
        gfx.fillStyle(0xffffff, 0.25);
        gfx.fillRect(px + 4, py + 4, TILE - 10, 6);
    }

    update(_time, delta) {
        if (this.paused || this.clearing) return;
        this.scrollBoard((SCROLL_SPEED / 1000) * delta);
        this.drawBoard();
    }
}
