import { defineConfig } from 'vite';

export default defineConfig({
    root: 'src',
    publicDir: '../public',
    server: {
        port: 8080,
        open: true
    },
    build: {
        outDir: '../dist',
        emptyOutDir: true
    }
});
