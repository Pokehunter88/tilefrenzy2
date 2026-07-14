import Phaser from 'phaser';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, height / 2, 'Tile Frenzy', {
            fontFamily: 'Arial',
            fontSize: 48,
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    update(_time, _delta) {
        // Main game loop logic goes here.
    }
}
