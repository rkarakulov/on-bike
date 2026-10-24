// Expo (SDK 52+) сам настраивает Metro под монорепо; добавляем только условие
// экспорта, чтобы workspace-пакеты брались из исходников без сборки.
const { getDefaultConfig } = require('expo/metro-config');

const SOURCE = '@pokatim/source';

const config = getDefaultConfig(__dirname);
config.resolver.unstable_conditionNames = [
  SOURCE,
  ...(config.resolver.unstable_conditionNames ?? []),
];
// серверный бандл web (SSR, environment=node) Expo CLI собирает с условиями заново (['node']) —
// без source он искал бы dist workspace-пакетов. Возвращаем условие в каждом окружении
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const names = context.unstable_conditionNames ?? [];
  const withSource = names.includes(SOURCE)
    ? context
    : { ...context, unstable_conditionNames: [SOURCE, ...names] };
  return withSource.resolveRequest(withSource, moduleName, platform);
};

// кеш трансформаций Metro общий для всех проектов (TMPDIR), а Expo кладёт в него абсолютный путь маршрута
// с loader-ом: в другой копии проекта (worktree, рендер шаблона) loader молча пропадал из web-сборки
config.cacheVersion = `${config.cacheVersion ?? ''}:${__dirname}`;

module.exports = config;
