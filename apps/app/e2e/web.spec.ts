import { expect, test, type Page } from '@playwright/test';

import { DEV_URL } from './urls';

// Смоук web-версии: SSR → гидрация → навигация, публичный экран с OG, витрина (dev), PWA.
// На каждой странице — без необработанных ошибок (рассинхрон гидрации, исключения в браузере);
// console.error — только у production-сборки: у dev-сборки свои предупреждения React.

const errors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (error) => list.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error' || page.url().startsWith(DEV_URL)) return;
    // недоступный API (в CI его нет) — сетевая ошибка запроса, а не ошибка страницы
    if (!/Failed to load resource|net::ERR_/.test(message.text())) list.push(message.text());
  });
});

test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

// TODO(F5b S5): смоук on-bike (гард сессии, регистрация); вкладки «Раздел» шаблона в on-bike нет
test('Главная: HTML с сервера, гидрация', async ({ page, request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Главная');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
});

test('публичный экран /status: заголовок и OG в HTML до JS, после гидрации — тот же экран', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/status')).text();
  expect(html).toContain('Статус сервиса');
  expect(html).toMatch(/<meta property="og:title" content="Статус сервиса"/);

  await page.goto('/status');
  await expect(page.getByRole('heading', { name: 'Статус сервиса' })).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Статус сервиса',
  );
  await expect(page).toHaveTitle(/^Статус сервиса — /);
});

test('витрина /ui-kit: в production — Главная', async ({ page }) => {
  await page.goto('/ui-kit');
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
});

test('витрина /ui-kit (dev-сборка): заголовок и разделы', async ({ page }) => {
  await page.goto(`${DEV_URL}/ui-kit`);
  await expect(page.getByRole('heading', { name: 'Витрина компонентов' })).toBeVisible();
  for (const section of ['Кнопки', 'Поля и выбор', 'Пустое состояние']) {
    await expect(page.getByText(section, { exact: true })).toBeVisible();
  }
});

test('PWA: manifest без ошибок, устанавливается, service worker активен', async ({ page }) => {
  await page.goto('/');
  const scriptURL = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).active?.scriptURL,
  );
  expect(scriptURL).toMatch(/\/sw\.js$/);

  const cdp = await page.context().newCDPSession(page);
  const { errors: manifestErrors } = await cdp.send('Page.getAppManifest');
  expect(manifestErrors).toEqual([]);
  // контекст Playwright — инкогнито: эта причина есть всегда, остальные — реальные проблемы PWA
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors.filter(({ errorId }) => errorId !== 'in-incognito')).toEqual([]);
});
