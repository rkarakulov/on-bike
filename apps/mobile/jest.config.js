// часовой пояс тестов — явно (rules/tests.md): восточнее UTC, чтобы ловить сдвиг дат через toISOString()
process.env.TZ = 'Europe/Minsk';

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // моки нативных модулей (secure-store, netinfo, datetimepicker) — общие для всех тестов
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // workspace-пакеты — из исходников, как в Metro
  testEnvironmentOptions: {
    customExportConditions: ['@on-bike/source', 'require', 'react-native'],
  },
};
