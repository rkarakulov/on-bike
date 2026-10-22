/// <reference types="jest" />
// Моки нативных модулей для всех тестов: в jest нет ни Keychain, ни NetInfo, ни нативного пикера.
import { onlineManager } from '@tanstack/react-query';

import { resetRegistrationStore } from './src/features/auth/registration-store';
import { resetSessionStore } from './src/features/auth/session-store';

jest.mock('expo-secure-store', () => {
  // in-memory хранилище; тесты читают его через jest.requireMock('expo-secure-store').__store
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  // iOS-пикер — хост-элемент с пропсами: тест вызывает fireEvent(picker, 'valueChange', event, date)
  const DateTimePicker = (props: object) =>
    createElement(View, { testID: 'date-picker', ...props });
  return {
    __esModule: true,
    default: DateTimePicker,
    DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
  };
});

// до теста, а не после: в afterEach экраны прошлого теста ещё смонтированы (сброс стора вне act)
beforeEach(() => {
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store.clear();
  // сторы и onlineManager — синглтоны модулей: каждый тест начинает как свежий запуск приложения
  resetSessionStore();
  resetRegistrationStore();
  onlineManager.setOnline(true);
});
