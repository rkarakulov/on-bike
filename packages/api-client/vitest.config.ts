import { defineConfig } from 'vitest/config';

// исходники workspace-пакетов (@pokatim/contracts) напрямую, без сборки dist
export default defineConfig({
  ssr: {
    resolve: { conditions: ['@pokatim/source', 'module', 'node', 'development|production'] },
  },
});
