import Head from 'expo-router/head';

/** Web: `<title>` после клиентской навигации; при SSR заголовок — из `generateMetadata` маршрута. */
export function DocumentTitle({ title }: { title: string }) {
  return (
    <Head>
      <title>{title}</title>
    </Head>
  );
}
