// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';

// SSR нужен ради динамических OG-мета по расшаренным ссылкам (ride, route, calendar, result, card)
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    resolve: { conditions: ['@on-bike/source', 'module', 'browser', 'development|production'] },
    ssr: {
      resolve: { conditions: ['@on-bike/source', 'module', 'node', 'development|production'] },
    },
  },
});
