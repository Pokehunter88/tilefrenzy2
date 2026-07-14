import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        const { width, height } = this.scale;

        const barWidth = 320;
        const barHeight = 32;
        const barX = (width - barWidth) / 2;
        const barY = (height - barHeight) / 2;

        this.add.rectangle(width / 2, height / 2, barWidth + 4, barHeight + 4, 0x222222);
        const bar = this.add.rectangle(barX + 2, height / 2, 4, barHeight - 4, 0x00ff66).setOrigin(0, 0.5);

        this.load.on('progress', (progress) => {
            bar.width = 4 + (barWidth - 8) * progress;
        });

        // Load your game assets here, e.g.:
        // this.load.image('logo', 'assets/logo.png');
        // this.load.spritesheet('tiles', 'assets/tiles.png', { frameWidth: 32, frameHeight: 32 });
    }

    create() {
        this.scene.start('Game');
    }
}
