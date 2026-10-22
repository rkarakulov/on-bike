// Подключает .githooks как core.hooksPath (вызывается из `pnpm install` через prepare).
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (process.env.CI || !existsSync('.git')) process.exit(0);
execFileSync('git', ['config', 'core.hooksPath', '.githooks']);
