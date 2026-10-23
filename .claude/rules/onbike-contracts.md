---
paths:
  - "packages/contracts/**"
  - "packages/api-client/**"
---

# on-bike — контракты (дополняет `contracts.md`)

- Структура on-bike: `src/<context>/<entity>.schema.ts` (например, `src/auth/registration.schema.ts`), публичный
  экспорт — `src/index.ts`.
- Кластеры, места, правдоподобие результата — бизнес-правила сервера: в схемах запросов их нет, клиент их
  не присылает.
- Коды ошибок on-bike добавляются в конец `defineErrorCodes` / `defineFieldErrorCodes` (`common.ts`): установленные
  приложения знают прежний состав.
