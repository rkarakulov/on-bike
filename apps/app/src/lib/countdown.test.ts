/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { formatCountdown, useSecondsLeft } from './countdown';

describe('formatCountdown', () => {
  it('минуты и секунды, с часами — когда дольше часа', () => {
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(3 * 3600 + 5 * 60 + 7)).toBe('3:05:07');
  });
});

describe('useSecondsLeft', () => {
  beforeEach(() => jest.useFakeTimers({ now: new Date('2026-10-22T10:00:00Z') }));
  afterEach(() => jest.useRealTimers());

  it('считает секунды до момента и останавливается на нуле', async () => {
    const until = Date.now() + 3000;
    const { result } = await renderHook(() => useSecondsLeft(until));
    expect(result.current).toBe(3);

    await act(() => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(2);

    await act(() => jest.advanceTimersByTime(5000));
    expect(result.current).toBe(0);
  });

  it('без момента — ноль', async () => {
    const { result } = await renderHook(() => useSecondsLeft(undefined));
    expect(result.current).toBe(0);
  });
});
