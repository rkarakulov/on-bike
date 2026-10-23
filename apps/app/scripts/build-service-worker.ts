// После `expo export --platform web`: пишет dist/client/sw.js (precache хешированной статики сборки).
// Запуск — `pnpm build:web` (Node, strip types).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { precacheList, serviceWorkerSource } from './service-worker.ts';

const client = join(import.meta.dirname, '..', 'dist', 'client');

const paths = readdirSync(client, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => `/${relative(client, join(entry.parentPath, entry.name)).split(sep).join('/')}`);

const files = precacheList(paths).map((path) => ({
  path,
  content: readFileSync(join(client, ...path.split('/'))),
}));
writeFileSync(join(client, 'sw.js'), serviceWorkerSource(files));
process.stdout.write(`sw.js: ${files.length} файлов статики в precache\n`);
