/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  // workspace-пакеты — из исходников, как в Metro
  testEnvironmentOptions: {
    customExportConditions: ['@on-bike/source', 'require', 'react-native'],
  },
};
