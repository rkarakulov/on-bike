// Expo (SDK 52+) сам настраивает Metro под монорепо; добавляем только условие
// экспорта, чтобы workspace-пакеты брались из исходников без сборки.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.unstable_conditionNames = [
  '@on-bike/source',
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;
