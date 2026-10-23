---
paths:
  - "apps/app/**"
---

# Приложение — apps/app (Expo + Expo Router)

Процесс: скил `app-dev-kit:mobile-expo`. Рамки продукта — `AGENTS.md` §1.

## Правила

- Маршруты — файловые в `src/app/` (не-роутовый код — вне `src/app/`); deep links — через Router,
  схема `onbike://`.
- Данные — только через `@on-bike/api-client` (TanStack Query, `src/lib/api.ts`). Локальное состояние — минимум.
- Строки UI — только из `@on-bike/i18n`.
- Оформление — только семантика: `useTheme()` (роли `text.*`, `surface.*`, `border.*`…), `textStyle(name)`,
  `space` / `inset` / `size` / `stroke` из `@on-bike/design-tokens`. Примитивы (`color.*`) и hex — нельзя.
- Дизайн-система — единственный источник оформления (`AGENTS.md` §4): сначала компоненты `@rkarakulov/ui`
  (Button, TextAction, TextField, Banner, Skeleton…). Чего не хватает — расширяй систему: токен/роль в
  `@on-bike/design-tokens` (бренд) или задачей в app-foundation (общий токен/компонент `@rkarakulov/ui` с
  тестом и примером на витрине `UiKit`, экран `/ui-kit` в dev).
- Дизайн-система настраивается в `src/theme/design-system.ts` (`configureDesignSystem`) — первым импортом
  корня приложения и `jest.setup.ts`; сторож — тест первого импорта.
- Состояния данных — строго по `AGENTS.md` §4, через `AsyncContent` и `SkeletonGroup` + `Skeleton` /
  `SkeletonText` из `@rkarakulov/ui`.
- QueryClient подключает `onlineManager` к `@react-native-community/netinfo`: без этого в RN нет
  `fetchStatus: 'paused'`, и `AsyncContent` покажет «Нет соединения» только после всех ретраев.
- Доступность: `accessibilityLabel`/`accessibilityRole` на интерактивных элементах, reduce motion, крупный шрифт.
- Секреты в бандл не кладём: в приложении только публичные ключи.
- Нативные модули — только через config plugins Expo; `ios/`/`android/` не коммитим (CNG).
