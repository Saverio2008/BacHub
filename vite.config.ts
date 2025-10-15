import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    root: '.',
    build: {
        rollupOptions: {
            input: {
                popup: resolve(__dirname, 'src/popup/popup.ts'),
                background: resolve(__dirname, 'src/background/background.ts'),
                content: resolve(__dirname, 'src/content/content.ts'),
            },
            output: {
                entryFileNames: (chunk) => {
                    if (chunk.name === 'popup') return 'popup/[name].js';
                    if (chunk.name === 'background') return 'background/[name].js';
                    if (chunk.name === 'content') return 'content/[name].js';
                    return '[name]/[name].js';
                },
                chunkFileNames: '[name]/[name].js',
                assetFileNames: 'assets/[name].[ext]',
            },
        },
        outDir: 'dist',
        emptyOutDir: true,
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'manifest.json', dest: '' },
                { src: 'src/assets', dest: 'assets' },
                { src: 'src/popup/popup.html', dest: 'popup' }
            ],
        }),
    ],
    server: {
        open: '/src/popup/popup.html',
    },
});