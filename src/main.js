import Phaser from 'phaser';
import { Boot } from './scenes/Boot.js';
import { Preloader } from './scenes/Preloader.js';
import { Game } from './scenes/Game.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    // width: 1024,
    // height: 768,
    width: 430,
    height: 220,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [Boot, Preloader, Game]
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
    const canvas = game.canvas;
    canvas.style.setProperty('image-rendering', 'pixelated', 'important');
    canvas.style.setProperty('image-rendering', 'crisp-edges', 'important');
});
