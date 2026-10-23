import { defineConfig } from 'vitest/config';

// исходники workspace-пакетов (@on-bike/contracts) напрямую, без сборки dist
export default defineConfig({
  ssr: {
    resolve: { conditions: ['@on-bike/source', 'module', 'node', 'development|production'] },
  },
});
