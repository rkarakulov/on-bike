/// <reference types="jest" />
import { formatCalendarDate, fromCalendarDate, toCalendarDate } from './calendar-date';

describe('календарная дата без часового пояса', () => {
  it('берёт локальные компоненты даты из пикера — полночь не сдвигается в предыдущий день', () => {
    // пикер отдаёт локальную полночь; toISOString() дал бы «1991-03-13» восточнее UTC
    expect(toCalendarDate(new Date(1991, 2, 14))).toBe('1991-03-14');
    expect(toCalendarDate(new Date(2000, 0, 1, 23, 59))).toBe('2000-01-01');
  });

  it('обратно — локальная полночь того же дня', () => {
    const date = fromCalendarDate('1991-03-14');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      1991, 2, 14, 0,
    ]);
    expect(toCalendarDate(fromCalendarDate('2010-12-31'))).toBe('2010-12-31');
  });

  it('подпись — как в прототипе: «14 марта 1991»', () => {
    expect(formatCalendarDate('1991-03-14')).toBe('14 марта 1991');
    expect(formatCalendarDate('2010-05-02')).toBe('2 мая 2010');
  });
});
