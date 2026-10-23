/**
 * Заголовок документа (вкладки браузера) — только web: `document-title.web.tsx`. Native: заголовка нет.
 * `expo-router/head` здесь нельзя: на iOS (dev client, сборки) он регистрирует NSUserActivity и без `origin`
 * у плагина expo-router бросает ошибку при рендере.
 */
export const DocumentTitle: (props: { title: string }) => null = () => null;
