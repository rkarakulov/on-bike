/// <reference types="jest" />
import { renderHook } from '@testing-library/react';
import { useLoaderData } from 'expo-router';

import { useLoaderSeed } from './loader-seed';

jest.mock('expo-router', () => ({ useLoaderData: jest.fn() }));
const loaderData = jest.mocked(useLoaderData);

describe('useLoaderSeed (web)', () => {
  it('данные loader маршрута — посев запроса', () => {
    loaderData.mockReturnValue({ status: 'ok' });
    const { result } = renderHook(() => useLoaderSeed<{ status: string }>());
    expect(result.current).toEqual({ status: 'ok' });
  });

  it('loader вернул null (API недоступен) — без посева', () => {
    loaderData.mockReturnValue(null);
    const { result } = renderHook(() => useLoaderSeed());
    expect(result.current).toBeUndefined();
  });
});
