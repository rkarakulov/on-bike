/// <reference types="jest" />
import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AsyncContent, type AsyncState } from './async-content';
import { Skeleton } from './ui';

const state = (patch: Partial<AsyncState<string[]>>): AsyncState<string[]> => ({
  data: undefined,
  error: null,
  isPending: false,
  isError: false,
  fetchStatus: 'idle',
  refetch: jest.fn(),
  ...patch,
});

const renderContent = (query: AsyncState<string[]>) =>
  render(
    <AsyncContent
      query={query}
      skeleton={<Skeleton height={20} />}
      empty={{ when: (rides) => rides.length === 0, render: () => <Text>Пока нет райдов</Text> }}
    >
      {(rides) => <Text>{rides.join(', ')}</Text>}
    </AsyncContent>,
  );

describe('AsyncContent', () => {
  it('первая загрузка — скелетон, а не спиннер', async () => {
    await renderContent(state({ isPending: true, fetchStatus: 'fetching' }));
    expect(screen.getByRole('progressbar', { name: 'Загрузка' })).toBeOnTheScreen();
  });

  it('без сети на первой загрузке — сразу «Нет соединения», не вечный скелетон', async () => {
    await renderContent(state({ isPending: true, fetchStatus: 'paused' }));
    expect(screen.getByRole('header', { name: 'Нет соединения' })).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('сетевая ошибка — «Нет соединения», повтор вызывает refetch', async () => {
    const query = state({ isError: true, error: new ApiNetworkError(new TypeError('offline')) });
    await renderContent(query);

    expect(screen.getByRole('header', { name: 'Нет соединения' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it('ошибка сервера — «Не удалось загрузить», а не «Нет соединения»', async () => {
    await renderContent(state({ isError: true, error: new ApiHttpError(503, null) }));
    expect(screen.getByRole('header', { name: 'Не удалось загрузить' })).toBeOnTheScreen();
  });

  it('ответ неожиданной формы (ZodError и т.п.) — «Не удалось загрузить», не сеть', async () => {
    await renderContent(state({ isError: true, error: new Error('Invalid input') }));
    expect(screen.getByRole('header', { name: 'Не удалось загрузить' })).toBeOnTheScreen();
  });

  it('неудачное фоновое обновление не прячет загруженные данные', async () => {
    const query = state({ data: ['Логойск'], isError: true, error: new TypeError('offline') });
    await renderContent(query);

    expect(screen.getByText('Логойск')).toBeOnTheScreen();
    expect(screen.getByText('Данные могли устареть')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Повторить' }));
    expect(query.refetch).toHaveBeenCalled();
  });

  it('пусто — пустое состояние экрана', async () => {
    await renderContent(state({ data: [] }));
    expect(screen.getByText('Пока нет райдов')).toBeOnTheScreen();
  });

  it('данные — контент', async () => {
    await renderContent(state({ data: ['Логойск', 'Зыбицкая'] }));
    expect(screen.getByText('Логойск, Зыбицкая')).toBeOnTheScreen();
  });
});
