---
paths:
  - "packages/contracts/**"
  - "packages/api-client/**"
---

# Контракты — packages/contracts

- Zod-схемы здесь — единственный источник правды API. Типы выводятся `z.infer`, не дублируются.
- Схема описывает форму данных, а не бизнес-правила сервера.
- Структура: `src/<context>.ts` или `src/<context>/<entity>.ts`, публичный экспорт — `src/index.ts`.
- Enum-ы и коды ошибок — `as const` + `z.enum`; коды проекта добавляются к кодам базы через
  `defineErrorCodes` (`@rkarakulov/contracts-core`); клиенты не хардкодят строки статусов.
- Изменения обратно совместимы: новое поле — optional; удаление/переименование — через новую версию
  эндпоинта. Старые версии мобильного приложения в сторах ещё живы.
- Никаких импортов из `apps/*`, NestJS, React, React Native — пакет чистый TS + zod.
- `api-client` строится поверх contracts и `@rkarakulov/api-client-core`; ручной fetch в приложениях — нет.
- Любая правка — тест на схему (валидный/невалидный вход) + `pnpm typecheck` по всем потребителям.
