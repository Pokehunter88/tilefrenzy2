import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    server: {
        port: 8080,
        open: true,
        allowedHosts: ['crawdad-mature-implicitly.ngrok-free.app']
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    }
});
