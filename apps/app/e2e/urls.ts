// Адреса web-серверов смоука (playwright.config.ts): production-сборка (dist) и dev-сборка (dist-dev).
export const PORT = Number(process.env.E2E_PORT ?? 8090);
export const DEV_PORT = Number(process.env.E2E_DEV_PORT ?? PORT + 1);

export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;
