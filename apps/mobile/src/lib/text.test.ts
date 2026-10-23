/// <reference types="jest" />
import { keepTogether } from './text';

describe('keepTogether', () => {
  it('склеивает символы невидимым word joiner, текст тот же', () => {
    const glued = keepTogether('a.b@c.by');
    expect(glued).toBe('a\u2060.\u2060b\u2060@\u2060c\u2060.\u2060b\u2060y');
    expect(glued.replaceAll('\u2060', '')).toBe('a.b@c.by');
  });
});
