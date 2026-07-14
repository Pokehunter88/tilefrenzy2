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

        this.load.image('block1', 'assets/block1.png');
        this.load.image('block2', 'assets/block2.png');
        this.load.image('block3', 'assets/block3.png');
        this.load.image('block4', 'assets/block4.png');
        this.load.image('block5', 'assets/block5.png');
        this.load.image('cursor1', 'assets/cursor1.png');
        this.load.image('cursor2', 'assets/cursor2.png');
    }

    create() {
        document.fonts.load('16px "Press Start 2P"').then(() => {
            this.scene.start('Game');
        });
    }
}
