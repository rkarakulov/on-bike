import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// SWC нужен для emitDecoratorMetadata — без него DI NestJS в тестах не работает
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // своё условие + стандартные серверные условия Vite (иначе они затираются)
  ssr: { resolve: { conditions: ['@on-bike/source', 'module', 'node', 'development|production'] } },
  test: { include: ['src/**/*.test.ts'] },
});
