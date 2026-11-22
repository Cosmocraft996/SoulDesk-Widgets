import vue from '@vitejs/plugin-vue';
import { defineConfig, normalizePath } from 'vite';
import { fileURLToPath } from 'node:url';

const hotspotSource = fileURLToPath(new URL('../hotspot-source/', import.meta.url));
const hotspotWidgets = normalizePath(hotspotSource) + 'widgets/';
const refreshModule = fileURLToPath(new URL('./refresh.ts', import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [
    vue(),
    {
      name: 'hot-rank-refresh',
      enforce: 'pre',
      resolveId(id, importer) {
        if (id === '@vueuse/core' && importer && normalizePath(importer).startsWith(hotspotWidgets)) {
          return refreshModule;
        }
      },
    },
  ],
  publicDir: false,
  resolve: {
    alias: { '@': hotspotSource },
  },
  build: {
    target: 'es2022',
    outDir: '../../../../../widgets/hot-rank/src',
    emptyOutDir: false,
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      external: ['./host.js'],
      output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'style.css' },
    },
  },
});
