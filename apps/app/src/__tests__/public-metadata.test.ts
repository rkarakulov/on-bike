/// <reference types="jest" />
import { generateMetadata as registerMetadata } from '../app/(onboarding)/register';
import { generateMetadata as verifyMetadata } from '../app/auth/verify/[token]';

import { EMAIL, LINK_TOKEN } from './auth-fixtures';

jest.mock('@/lib/api');

const ORIGIN = 'https://on-bike.by';

afterEach(() => {
  delete process.env.WEB_ORIGIN;
});

// SSR web: мета публичных экранов в первых байтах HTML (превью ссылок), без персональных данных
describe('мета публичных экранов (generateMetadata)', () => {
  it('регистрация: заголовок, описание и OG; og:url — только из WEB_ORIGIN', async () => {
    expect(await registerMetadata(undefined, {})).toEqual({
      title: 'Регистрация — on-bike',
      description: 'Гонки, маршруты, кофе-райды и календарь стартов в одном профиле',
      openGraph: {
        title: 'Регистрация',
        description: 'Гонки, маршруты, кофе-райды и календарь стартов в одном профиле',
        type: 'website',
        siteName: 'on-bike',
      },
    });

    process.env.WEB_ORIGIN = `${ORIGIN}/`;
    expect(await registerMetadata(undefined, {})).toMatchObject({
      openGraph: { url: `${ORIGIN}/register` },
    });
  });

  it('ссылка из письма: нейтральный заголовок, без e-mail и без og:url (в пути токен)', async () => {
    process.env.WEB_ORIGIN = ORIGIN;
    const meta = await verifyMetadata(undefined, { token: LINK_TOKEN });

    expect(meta).toMatchObject({
      title: 'Подтвердите e-mail — on-bike',
      openGraph: { title: 'Подтвердите e-mail', siteName: 'on-bike' },
    });
    const serialized = JSON.stringify(meta);
    expect(serialized).not.toContain(LINK_TOKEN);
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain(ORIGIN);
  });
});
