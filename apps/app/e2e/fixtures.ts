import { test as base, expect, type Page } from '@playwright/test';

import { isExpectedResourceError, type ExpectedResourceError } from './console-errors';
import { expectedResourceErrors } from './project';
import { API_URL, DEV_URL, WITH_API } from './urls';

// Смоук web без ошибок страницы: необработанные исключения (`pageerror`, в т.ч. рассинхрон гидрации) и console.error
// production-сборки (у dev-сборки свои предупреждения React). Отказы загрузки ресурсов — только ожидаемые: отказ
// соединения с API, когда его нет (`E2E_API` ≠ 1), и список проекта (`e2e/project.ts`). Тесты импортируют `test`
// и `expect` отсюда; дополнительную вкладку подключает фикстура `watchErrors(page)`.

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const expected: ExpectedResourceError[] = [
  ...(WITH_API
    ? []
    : [
        {
          url: new RegExp(`^${escapeRegExp(API_URL)}/`),
          status: 'net::ERR_CONNECTION_REFUSED' as const,
        },
      ]),
  ...expectedResourceErrors,
];

export const test = base.extend<{ watchErrors: (page: Page) => void }>({
  watchErrors: [
    async ({ page }, use) => {
      const errors = new Map<Page, string[]>();
      const watch = (target: Page) => {
        const list: string[] = [];
        errors.set(target, list);
        target.on('pageerror', (error) => list.push(error.message));
        target.on('console', (message) => {
          if (message.type() !== 'error' || target.url().startsWith(DEV_URL)) return;
          const error = { text: message.text(), url: message.location().url };
          if (!isExpectedResourceError(error, expected)) list.push(`${error.text} (${error.url})`);
        });
      };
      watch(page);
      await use(watch);
      for (const [target, list] of errors) expect(list, target.url()).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
