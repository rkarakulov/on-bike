---
paths:
  - "apps/admin/**"
---

# Web — apps/admin (Vite + React)

Процесс: скил `app-dev-kit:web-ui`.

- Данные — `@pokatim/api-client` (TanStack Query); в dev `/v1` проксируется на API (`vite.config.ts`).
- Строки — `@pokatim/i18n`. Оформление — CSS-переменные и классы `.t-*` из `@pokatim/design-tokens`
  (`designSystemCss`, тема `panel`); hex и копии значений в CSS приложения — нельзя.
- Дизайн-система — единственный источник оформления (`AGENTS.md` §4): нового значения нет — бренд
  добавляется в `@pokatim/design-tokens`, общий токен — задачей в app-foundation (`@rkarakulov/design-tokens`),
  а не стиль по месту.
- Состояния данных — строго по `AGENTS.md` §4; загрузка — класс `.skeleton` из пакета.
- Деструктивные и необратимые действия — модалка с подтверждением; при аудите — с обязательной причиной.
- Доступность: семантические элементы, фокус, контраст, клавиатурная навигация.
