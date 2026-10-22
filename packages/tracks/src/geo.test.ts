import { describe, expect, it } from 'vitest';

import { haversineMeters, trackLengthMeters } from './geo.ts';

describe('geo', () => {
  const minsk = { lat: 53.9006, lon: 27.559 };
  const brest = { lat: 52.0976, lon: 23.7341 };

  it('считает расстояние Минск — Брест ≈ 326 км', () => {
    expect(haversineMeters(minsk, brest) / 1000).toBeCloseTo(326, -1);
  });

  it('длина трека из одной точки = 0', () => {
    expect(trackLengthMeters([minsk])).toBe(0);
  });
});
