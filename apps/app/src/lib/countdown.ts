import { useEffect, useState } from 'react';

const TICK_MS = 1000;

const secondsUntil = (until: number | undefined) =>
  until === undefined ? 0 : Math.max(0, Math.ceil((until - Date.now()) / 1000));

/** «0:42», «3:05:07». */
export function formatCountdown(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = String(totalSec % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** Секунды до момента `until` (мс), раз в секунду; на нуле таймер останавливается. */
export function useSecondsLeft(until: number | undefined): number {
  const [state, setState] = useState(() => ({ until, left: secondsUntil(until) }));
  // новый момент (повтор письма, 429) — пересчёт сразу, без кадра со старым значением
  const current = state.until === until ? state : { until, left: secondsUntil(until) };
  if (current !== state) setState(current);

  useEffect(() => {
    if (secondsUntil(until) === 0) return;
    const timer = setInterval(() => {
      const left = secondsUntil(until);
      setState({ until, left });
      if (left === 0) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [until]);

  return current.left;
}
