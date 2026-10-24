// Копирует в runtime-образ только нужные пакеты из установленного монорепо (nodeLinker: hoisted) — без
// devDependencies и без зависимостей других приложений (Expo/React Native весят сотни МБ). Версии — ровно те,
// что поставил `pnpm install --frozen-lockfile` по lockfile, ничего не докачивается.
//
//   node infra/docker/runtime-deps.mjs <root> <out> <entry...>
//
// entry — имя пакета (`express`) или каталог пакета от root (`./apps/api`: берутся его dependencies, сам
// каталог не копируется). Замыкание: dependencies + установленные optionalDependencies (нативные бинарники
// своей платформы) + обязательные peerDependencies. Workspace-пакеты (симлинки) копируются как обычные
// каталоги, только package.json и поле `files` (dist). Результат повторяет раскладку: <out>/node_modules/…
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const [rootArg, outArg, ...entries] = process.argv.slice(2);
if (!rootArg || !outArg || entries.length === 0) {
  console.error('usage: runtime-deps.mjs <root> <out> <entry...>');
  process.exit(2);
}
const root = realpathSync(rootArg);
const out = resolve(outArg);

const readManifest = (dir) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
const inside = (child, parent) => child === parent || child.startsWith(parent + sep);

/** Каталог пакета `name`, видимый из `fromDir`, — как его ищет Node (вверх по node_modules). */
function findPackage(name, fromDir) {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    if (dirname(dir) === dir) return null;
  }
}

/** Куда положить найденный пакет: вложенный node_modules — рядом с родителем в out, иначе — путь от root. */
function destination(candidate, parent) {
  if (inside(candidate, parent.src)) return join(parent.dest, relative(parent.src, candidate));
  if (!inside(candidate, root)) throw new Error(`пакет вне ${root}: ${candidate}`);
  return join(out, relative(root, candidate));
}

const copied = new Set();
let count = 0;

function copyPackage(linkPath, dest) {
  const src = realpathSync(linkPath);
  if (copied.has(dest)) return null;
  copied.add(dest);
  const manifest = readManifest(src);
  const workspace = !inside(src, join(root, 'node_modules'));
  mkdirSync(dest, { recursive: true });
  if (workspace) {
    cpSync(join(src, 'package.json'), join(dest, 'package.json'));
    for (const entry of manifest.files ?? []) {
      if (!existsSync(join(src, entry)))
        throw new Error(`${manifest.name}: нет ${entry} (не собран?)`);
      cpSync(join(src, entry), join(dest, entry), { recursive: true });
    }
  } else {
    // вложенные node_modules копируются только по мере надобности — через замыкание ниже
    cpSync(src, dest, {
      recursive: true,
      filter: (path) => !inside(path, join(src, 'node_modules')),
    });
  }
  count += 1;
  return { src, dest, manifest };
}

function dependenciesOf(manifest) {
  const optionalPeers = manifest.peerDependenciesMeta ?? {};
  return [
    ...Object.keys(manifest.dependencies ?? {}).map((name) => ({ name, required: true })),
    ...Object.keys(manifest.optionalDependencies ?? {}).map((name) => ({ name, required: false })),
    ...Object.keys(manifest.peerDependencies ?? {})
      .filter((name) => optionalPeers[name]?.optional !== true)
      .map((name) => ({ name, required: false })),
  ];
}

function walk(pkg) {
  for (const { name, required } of dependenciesOf(pkg.manifest)) {
    const found = findPackage(name, pkg.src);
    if (!found) {
      if (required) throw new Error(`${pkg.manifest.name}: зависимость ${name} не установлена`);
      continue;
    }
    const next = copyPackage(found, destination(found, pkg));
    if (next) walk(next);
  }
}

for (const entry of entries) {
  if (entry.startsWith('./')) {
    const src = join(root, entry);
    walk({ src, dest: join(out, entry), manifest: readManifest(src) });
  } else {
    const found = findPackage(entry, root);
    if (!found) throw new Error(`пакет ${entry} не установлен`);
    const pkg = copyPackage(found, join(out, relative(root, found)));
    if (pkg) walk(pkg);
  }
}
process.stdout.write(`runtime-deps: ${count} пакетов → ${out}\n`);
