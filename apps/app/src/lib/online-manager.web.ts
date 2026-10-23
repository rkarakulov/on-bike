/**
 * Web: onlineManager TanStack Query сам следит за `navigator.onLine` и событиями online/offline, а на сервере
 * (SSR) считает сеть доступной. NetInfo здесь не нужен: на сервере он сообщал бы «нет сети» —
 * HTML приходил бы с «Нет соединения» вместо скелетона и расходился с гидрацией.
 */
export function connectOnlineManager() {}
