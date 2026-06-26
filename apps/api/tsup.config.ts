import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  // Bundle the workspace types package (it ships .ts source, not a build).
  noExternal: ['@gymily/types'],
});
