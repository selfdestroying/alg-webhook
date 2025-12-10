import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  bundle: true,
  outDir: 'dist',
  target: 'es2022',
  clean: true,
  sourcemap: false,
  dts: false,
  shims: true,
  banner: {
    js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);',
  },
});
