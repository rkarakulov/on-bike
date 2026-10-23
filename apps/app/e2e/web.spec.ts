import { expect, test, type ConsoleMessage, type Page } from '@playwright/test';

import { verificationLink } from './mailpit';
import { API_URL, BASE_URL, DEV_URL, WITH_API } from './urls';

// Смоук web-версии on-bike: SSR → гидрация → гард сессии, публичные экраны с OG, витрина (dev), PWA;
// с API (E2E_API=1) — регистрация → письмо → подтверждение → вход → вход переживает перезагрузку (cookie).
// На каждой странице — без необработанных ошибок (рассинхрон гидрации, исключения в браузере);
// console.error — только у production-сборки: у dev-сборки свои предупреждения React.

const REFRESH_URL = `${API_URL}/v1/auth/session/refresh`;
/** Cookie refresh web-сессии — как задано (task.md F5b §7), а не импорт из contracts: смоук проверяет ответ API. */
const SESSION_COOKIE = { name: '__Secure-onbike_rt', path: '/v1/auth/session' };

/**
 * Ожидаемые console.error браузера (task.md §8.2, F5b S5): аноним при каждой загрузке восстанавливает сессию
 * (`POST …/session/refresh` без cookie → 401), Chrome пишет это как ошибку загрузки ресурса. Без API (E2E_API
 * не задан) — ещё отказ соединения с API. Всё остальное — падение.
 */
const isExpectedConsoleError = (message: ConsoleMessage) => {
  const text = message.text();
  const url = message.location().url;
  if (/^Failed to load resource: .*status of 401\b/.test(text) && url === REFRESH_URL) return true;
  return !WITH_API && text.includes('net::ERR_CONNECTION_REFUSED') && url.startsWith(API_URL);
};

const errors = new Map<Page, string[]>();

/** Ошибки страницы — в список, проверяемый после теста (и для дополнительных вкладок). */
function watch(page: Page) {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (error) => list.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error' || page.url().startsWith(DEV_URL)) return;
    if (!isExpectedConsoleError(message))
      list.push(`${message.text()} (${message.location().url})`);
  });
}

test.beforeEach(({ page }) => watch(page));

test.afterEach(() => {
  for (const [page, list] of errors) expect(list, page.url()).toEqual([]);
  errors.clear();
});

test('Главная без входа: HTML с сервера (скелетон оболочки), после гидрации — регистрация', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<div id="root"');

  await page.goto('/');
  await expect(page).toHaveURL(`${BASE_URL}/register`);
  await expect(page.getByText('Создать аккаунт', { exact: true })).toBeVisible();
});

test('публичный экран /register: форма, заголовок и OG в HTML до JS', async ({ page, request }) => {
  const html = await (await request.get('/register')).text();
  expect(html).toContain('Создать аккаунт');
  expect(html).toContain('<title>Регистрация — on-bike</title>');
  expect(html).toMatch(/<meta property="og:title" content="Регистрация"/);
  expect(html).toContain(`<meta property="og:url" content="${BASE_URL}/register"`);

  await page.goto('/register');
  await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible();
  await expect(page).toHaveTitle('Регистрация — on-bike');
});

// экран после гидрации (состояние ссылки из API) — в сценарии «с API»: неизвестный токен дал бы 404 в консоли
test('ссылка из письма /auth/verify/<токен>: HTML с сервера без og:url и без токена в мета', async ({
  request,
}) => {
  const token = 'x'.repeat(43);
  const response = await request.get(`/auth/verify/${token}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<title>Подтвердите e-mail — on-bike</title>');
  expect(html).toMatch(/<meta property="og:title" content="Подтвердите e-mail"/);
  expect(html).not.toContain('og:url');
  expect(html.match(/<meta [^>]*>/g)?.join('\n')).not.toContain(token);
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

test('витрина /ui-kit: в production — Главная (без входа — регистрация)', async ({ page }) => {
  await page.goto('/ui-kit');
  await expect(page).toHaveURL(`${BASE_URL}/register`);
});

test('витрина /ui-kit (dev-сборка): заголовок и разделы', async ({ page }) => {
  await page.goto(`${DEV_URL}/ui-kit`);
  await expect(page.getByRole('heading', { name: 'Витрина компонентов' })).toBeVisible();
  for (const section of ['Кнопки', 'Поля и выбор', 'Пустое состояние']) {
    await expect(page.getByText(section, { exact: true })).toBeVisible();
  }
});

test('PWA: manifest бренда без ошибок, устанавливается, service worker активен', async ({
  page,
}) => {
  await page.goto('/');
  const scriptURL = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).active?.scriptURL,
  );
  expect(scriptURL).toMatch(/\/sw\.js$/);

  const cdp = await page.context().newCDPSession(page);
  const { errors: manifestErrors, data } = await cdp.send('Page.getAppManifest');
  expect(manifestErrors).toEqual([]);
  expect(JSON.parse(data ?? '{}')).toMatchObject({ name: 'on-bike', theme_color: '#FFFFFF' });
  // контекст Playwright — инкогнито: эта причина есть всегда, остальные — реальные проблемы PWA
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors.filter(({ errorId }) => errorId !== 'in-incognito')).toEqual([]);
});

test.describe('с API', () => {
  test.skip(
    !WITH_API,
    'нужны API, worker, PostgreSQL, Redis и Mailpit: E2E_API=1 (runbook, «Web»)',
  );

  test('регистрация → письмо → подтверждение → вход; вход переживает перезагрузку (cookie)', async ({
    page,
    context,
    request,
  }) => {
    const email = `e2e-${Date.now()}@on-bike.test`;

    await page.goto('/');
    await expect(page).toHaveURL(`${BASE_URL}/register`);
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Пароль').fill('e2e-пароль-on-bike');
    await page.getByLabel('Дата рождения').fill('1990-05-15');
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Зарегистрироваться' }).click();
    await expect(page.getByText('Подтвердите e-mail', { exact: true })).toBeVisible();

    // ссылка письма для web — маршрут приложения (APP_LINK_BASE web)
    const link = await verificationLink(request, email);
    expect(link).toMatch(new RegExp(`^${BASE_URL}/auth/verify/[\\w-]{43}$`));

    // первая вкладка опрашивает подтверждение: ответ с сессией — без refresh в теле
    const verified = page.waitForResponse(
      async (response) =>
        response.url() === `${API_URL}/v1/auth/registration/poll` &&
        response.request().method() === 'POST' &&
        (await response.json()).state === 'verified',
    );

    // письмо открыто в другой вкладке того же браузера
    const mail = await context.newPage();
    watch(mail);
    await mail.goto(link);
    await expect(mail).toHaveTitle('Подтвердите e-mail — on-bike');
    await mail.getByRole('button', { name: 'Подтвердить e-mail' }).click();
    await expect(mail.getByText('E-mail подтверждён', { exact: true })).toBeVisible();

    const poll = await (await verified).json();
    expect(Object.keys(poll.session).sort()).toEqual([
      'accessToken',
      'accessTokenExpiresAt',
      'refreshTokenExpiresAt',
    ]);
    await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();

    // refresh — только в httpOnly cookie на пути сессии; JS страницы его не видит
    const cookies = await context.cookies();
    expect(cookies.find(({ name }) => name === SESSION_COOKIE.name)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: SESSION_COOKIE.path,
    });
    expect(await page.evaluate(() => document.cookie)).not.toContain(SESSION_COOKIE.name);

    // перезагрузка: access в памяти потерян, сессия восстанавливается по cookie (ротация refresh)
    const refreshed = page.waitForResponse(REFRESH_URL);
    await page.reload();
    expect((await refreshed).status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible();
  });
});
