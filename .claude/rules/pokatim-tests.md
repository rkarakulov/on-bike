---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/e2e/**"
---

# pokatim — тесты (дополняет `tests.md`)

- Обработка треков (`packages/tracks`, коридор, кластеры) — фикстуры реальных FIT/GPX/TCX в `__fixtures__/`,
  включая битые, пустые, без timestamp, вне коридора.
- PostGIS-запросы — только интеграционные тесты на реальной БД.
- e2e: веб — Playwright, приложение — Maestro (когда появятся).
- Часовой пояс тестов приложения — Europe/Minsk (`apps/app/jest.config.js`, AGENTS.md §4.7).
