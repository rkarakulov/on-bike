import { t } from '@pokatim/i18n';
import type { Metadata } from 'expo-router/server';

interface PublicPageMetadata {
  title: string;
  description: string;
  /**
   * Путь для `og:url` — только без секретов: путь с токеном (ссылки из писем) не передаём, превью и кеши
   * мессенджеров его бы сохранили.
   */
  path?: string;
}

/**
 * `generateMetadata` публичного экрана (SSR web): `<title>`, description и OG без персональных данных.
 * `og:url` — только из `WEB_ORIGIN` (env сервера), не из Host запроса: подменённый заголовок отравил бы кеш и превью.
 */
export function publicPageMetadata({ title, description, path }: PublicPageMetadata): Metadata {
  const origin = process.env.WEB_ORIGIN?.replace(/\/$/, '');
  return {
    title: `${title} — ${t('app.name')}`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: t('app.name'),
      ...(origin && path ? { url: `${origin}${path}` } : {}),
    },
  };
}
