// часовой пояс тестов — явно (rules/tests.md): восточнее UTC, чтобы ловить сдвиг дат через toISOString()
process.env.TZ = 'Europe/Minsk';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // моки нативных модулей (secure-store, netinfo, datetimepicker) — общие для всех тестов
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // список пресета jest-expo 58 (jest-preset.js) + пакеты базы @rkarakulov/* (ESM) — их тоже транспилируем
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|@rkarakulov))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  // workspace-пакеты — из исходников, как в Metro
  testEnvironmentOptions: {
    customExportConditions: ['@on-bike/source', 'require', 'react-native'],
  },
};
