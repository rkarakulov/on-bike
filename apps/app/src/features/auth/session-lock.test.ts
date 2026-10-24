/// <reference types="jest" />
import { withSessionLock } from './session-lock';

function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('замок сессии (native)', () => {
  it('операции идут по одной: вторая начинается только после первой', async () => {
    const order: string[] = [];
    const first = deferred();

    const a = withSessionLock(async () => {
      order.push('a:start');
      await first.promise;
      order.push('a:end');
      return 'a';
    });
    const b = withSessionLock(async () => {
      order.push('b');
      return 'b';
    });
    await Promise.resolve();
    expect(order).toEqual(['a:start']);

    first.resolve();
    await expect(Promise.all([a, b])).resolves.toEqual(['a', 'b']);
    expect(order).toEqual(['a:start', 'a:end', 'b']);
  });

  it('сбой операции отдаётся вызвавшему и не останавливает очередь', async () => {
    const failing = withSessionLock(() => Promise.reject(new Error('network')));
    const next = withSessionLock(() => Promise.resolve('next'));

    await expect(failing).rejects.toThrow('network');
    await expect(next).resolves.toBe('next');
  });
});
