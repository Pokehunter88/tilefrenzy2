import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load any assets needed for the Preloader scene itself here
        // (e.g. a loading bar background image).
    }

    create() {
        this.scene.start('Preloader');
    }
}
