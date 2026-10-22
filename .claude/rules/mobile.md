---
paths:
  - "apps/mobile/**"
---

# Mobile — apps/mobile (Expo SDK 58 + Expo Router)

Процесс: скил `.claude/skills/mobile-expo/SKILL.md`.

## Рамки MVP (не расширять без ADR)

- Нет записи GPS, нет фоновой геолокации, нет BLE-датчиков, нет push, нет Strava/Garmin API.
- Геолокация — только foreground для «рядом», после pre-permission экрана, с баннером при отказе.
- Заезды и маршруты — импорт файла через системный picker (заезд: GPX/TCX/FIT; маршрут: GPX/KML).
- Уведомления — in-app центр, обновление polling'ом.

## Правила

- Маршруты — файловые в `src/app/` (не-роутовый код — вне `src/app/`); deep links / universal links для 5 типов объектов идут через Router.
- Данные — только через `@on-bike/api-client` (TanStack Query). Локальное состояние — минимальный zustand.
- Формы — react-hook-form + zod-схема из contracts.
- Строки UI — только из `@on-bike/i18n`, формальное «вы».
- Оформление — только семантика: `useTheme()` (роли `text.*`, `surface.*`, `border.*`…), `textStyle(name)`,
  `space` / `inset` / `size` / `stroke` из `@on-bike/design-tokens`. Примитивы (`color.*`) и hex — нельзя.
- Дизайн-система — единственный источник оформления (AGENTS.md §4.11): сначала компоненты `src/components/ui`
  (Button, TextAction, TextField, Banner, Skeleton…). Чего не хватает — расширяй систему: токен/роль в
  `@on-bike/design-tokens`, компонент в `src/components/ui` с тестом и примером на витрине `/ui-kit`.
  Что разрешено без токенов — только раскладка, список в AGENTS.md §4.11.
- Темы: светлая Jersey Aura, тёмная Night Ride, системная.
- Доступность: `accessibilityLabel`/`accessibilityRole` на интерактивных элементах, `accessibilityActions`
  для drag-n-drop, поддержка reduce motion, крупного шрифта.
- QueryClient мобилки обязан подключать `onlineManager` к `@react-native-community/netinfo`: без этого
  в RN нет `fetchStatus: 'paused'`, и `AsyncContent` покажет «Нет соединения» только после всех ретраев.
- Состояния данных — строго по AGENTS.md §4.12, через `AsyncContent` (`src/components/async-content.tsx`) и
  `SkeletonGroup` + `Skeleton` / `SkeletonText` / заготовки из `src/components/ui`.
- Секреты в бандл не кладём: в приложении только публичные ключи (Sentry DSN, тайлы).
- Нативные модули — только через config plugins Expo; `ios/`/`android/` не коммитим (CNG).
