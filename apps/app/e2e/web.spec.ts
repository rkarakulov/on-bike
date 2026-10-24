import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { verificationLink } from './mailpit';
import { REFRESH_URL } from './project';
import { API_URL, BASE_URL, DEV_URL, WITH_API } from './urls';

// Смоук web-версии on-bike: SSR → гидрация → гард сессии, публичные экраны с OG, витрина (dev), PWA;
// с API (E2E_API=1) — регистрация → письмо → подтверждение → вход → вход переживает перезагрузку (cookie).
// Ошибки страницы (исключения, рассинхрон гидрации, неожиданные отказы загрузки) проверяет фикстура (fixtures.ts);
// ожидаемый 401 восстановления сессии анонима — в e2e/project.ts.

/** Cookie refresh web-сессии — как задано (task.md F5b §7), а не импорт из contracts: смоук проверяет ответ API. */
const SESSION_COOKIE = { name: '__Secure-onbike_rt', path: '/v1/auth/session' };

/**
 * Главная гостя после гидрации. С API: восстановление сессии — 401, гард ведёт на регистрацию. Без API: сеть
 * недоступна — это не выход (onbike-app.md, «Сессия в вебе»): Главная остаётся, «Нет соединения» с повтором.
 */
async function expectGuestHome(page: Page) {
  if (WITH_API) {
    await expect(page).toHaveURL(`${BASE_URL}/register`);
    await expect(page.getByText('Создать аккаунт', { exact: true })).toBeVisible();
    return;
  }
  await expect(page.getByRole('heading', { name: 'Нет соединения' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible();
  await expect(page).toHaveURL(`${BASE_URL}/`);
}

test('Главная без входа: HTML с сервера (скелетон оболочки), после гидрации — регистрация (без API — «Нет соединения»)', async ({
  page,
  request,
}) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('<div id="root"');

  await page.goto('/');
  await expectGuestHome(page);
});

test('публичный экран /register: форма, заголовок и OG в HTML до JS', async ({ page, request }) => {
  const html = await (await request.get('/register')).text();
  expect(html).toContain('Создать аккаунт');
  expect(html).toContain('<title>Регистрация — Покатим</title>');
  expect(html).toMatch(/<meta property="og:title" content="Регистрация"/);
  expect(html).toContain(`<meta property="og:url" content="${BASE_URL}/register"`);

  await page.goto('/register');
  await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeVisible();
  await expect(page).toHaveTitle('Регистрация — Покатим');
});

// экран после гидрации (состояние ссылки из API) — в сценарии «с API»: неизвестный токен дал бы 404 в консоли
test('ссылка из письма /auth/verify/<токен>: HTML с сервера без og:url и без токена в мета', async ({
  request,
}) => {
  const token = 'x'.repeat(43);
  const response = await request.get(`/auth/verify/${token}`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<title>Подтвердите e-mail — Покатим</title>');
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

test('витрина /ui-kit: в production — Главная гостя', async ({ page }) => {
  await page.goto('/ui-kit');
  await expectGuestHome(page);
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
  expect(JSON.parse(data ?? '{}')).toMatchObject({ name: 'Покатим', theme_color: '#FFFFFF' });
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
    watchErrors,
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
    watchErrors(mail);
    await mail.goto(link);
    await expect(mail).toHaveTitle('Подтвердите e-mail — Покатим');
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
