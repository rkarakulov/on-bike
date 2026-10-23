const { transformIgnorePatterns } = require('jest-expo/jest-preset');

// часовой пояс тестов — явно: восточнее UTC и без перехода на летнее время, чтобы ловить сдвиг
// дат через toISOString() и не зависеть от сезона; on-bike — Europe/Minsk (AGENTS.md §4.7)
process.env.TZ = 'Europe/Minsk';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // дизайн-система проекта и моки нативных модулей — общие для всех тестов
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // список пресета jest-expo целиком + пакеты базы @rkarakulov/* (ESM) — их тоже транспилируем
  transformIgnorePatterns: [
    transformIgnorePatterns[0].replace('(?!(', '(?!(@rkarakulov/|'),
    ...transformIgnorePatterns.slice(1),
  ],
  // workspace-пакеты — из исходников, как в Metro
  testEnvironmentOptions: {
    customExportConditions: ['@on-bike/source', 'require', 'react-native'],
  },
};
