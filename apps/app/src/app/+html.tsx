import { autofillCss, themes } from '@on-bike/design-tokens';
import { i18n } from '@on-bike/i18n';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

// фон документа до гидрации — из темы по системной схеме: без белой вспышки в тёмной теме
const documentBackground = `
html, body { background-color: ${themes.light.surface.default}; }
@media (prefers-color-scheme: dark) {
  html, body { background-color: ${themes.dark.surface.default}; }
}`;

// автозаполнение браузера (:-webkit-autofill) — фон и текст поля темы вместо голубой заливки браузера
const autofill = autofillCss({ theme: themes.light, darkTheme: themes.dark });

// service worker (кеш статики, scripts/service-worker.ts) — только в production: в dev он кешировал бы бандлы Metro
const registerServiceWorker = `
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}`;

/**
 * Корневой HTML web-версии: только сервер (SSR), в браузере не гидратируется — без `window`/`document`.
 * `useServerDocumentContext` — все четыре поля: мета маршрута (`generateMetadata`), стили, бандлы гидрации.
 */
export default function RootHtml({ children }: { children: ReactNode }) {
  const { htmlAttributes, headNodes, bodyAttributes, bodyNodes } = useServerDocumentContext();

  return (
    // базовый язык словаря; язык пользователя на сервере (Accept-Language) — вместе с сессией в web
    <html lang={i18n.locales[0]} {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content={themes.light.surface.default}
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content={themes.dark.surface.default}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <style dangerouslySetInnerHTML={{ __html: documentBackground }} />
        <style dangerouslySetInnerHTML={{ __html: autofill }} />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
        {process.env.NODE_ENV === 'production' ? (
          <script dangerouslySetInnerHTML={{ __html: registerServiceWorker }} />
        ) : null}
      </body>
    </html>
  );
}
