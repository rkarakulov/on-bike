/// <reference types="jest" />
import { themes, typography } from '@on-bike/design-tokens';
import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Text, useColorScheme } from 'react-native';

import { Skeleton, SkeletonGroup, SkeletonText } from './skeleton';

const colorScheme = jest.mocked(useColorScheme);

afterEach(() => {
  colorScheme.mockReturnValue('light');
  jest.restoreAllMocks();
});

describe('SkeletonGroup', () => {
  it('для скринридера — один элемент «Загрузка» в состоянии busy, блоки скрыты', async () => {
    await render(
      <SkeletonGroup>
        <Text>скрытый контент</Text>
      </SkeletonGroup>,
    );

    const group = screen.getByRole('progressbar', { name: 'Загрузка' });
    expect(group).toHaveProp('accessibilityState', { busy: true });
    expect(screen.queryByText('скрытый контент')).toBeNull();
  });

  /** ответ системы о reduce motion приходит асинхронно — управляем им вручную */
  const deferReduceMotion = () => {
    let answer: (value: boolean) => void = () => undefined;
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise((resolve) => (answer = resolve)));
    return (value: boolean) => act(async () => answer(value));
  };

  const renderGroup = () =>
    render(
      <SkeletonGroup>
        <Skeleton height={20} />
      </SkeletonGroup>,
    );

  it('пока настройка неизвестна — пульс не стартует', async () => {
    deferReduceMotion();
    const loop = jest.spyOn(Animated, 'loop');
    await renderGroup();
    expect(loop).not.toHaveBeenCalled();
  });

  it('reduce motion выключен — пульс стартует после ответа системы', async () => {
    const respond = deferReduceMotion();
    const loop = jest.spyOn(Animated, 'loop');
    await renderGroup();

    await respond(false);
    expect(loop).toHaveBeenCalledTimes(1);
  });

  it('reduce motion включён — пульс не стартует и после ответа', async () => {
    const respond = deferReduceMotion();
    const loop = jest.spyOn(Animated, 'loop');
    await renderGroup();

    await respond(true);
    expect(loop).not.toHaveBeenCalled();
    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).toHaveStyle({
      opacity: 1,
    });
  });
});

describe('Skeleton', () => {
  it('цвет — surface.skeleton темы (light и dark)', async () => {
    await render(<Skeleton height={20} />);
    expect(screen.getByTestId('skeleton')).toHaveStyle({
      backgroundColor: themes.light.surface.skeleton,
      height: 20,
    });

    colorScheme.mockReturnValue('dark');
    await render(<Skeleton height={20} />);
    expect(screen.getAllByTestId('skeleton').at(-1)).toHaveStyle({
      backgroundColor: themes.dark.surface.skeleton,
    });
  });

  it('SkeletonText: строки высотой кегля, последняя короче', async () => {
    await render(<SkeletonText variant="body" lines={3} lastLineWidth="40%" />);

    const lines = screen.getAllByTestId('skeleton');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveStyle({ height: typography.body.size, width: '100%' });
    expect(lines[2]).toHaveStyle({ width: '40%' });
  });
});
