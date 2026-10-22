# Каркас мобильного приложения: splash, шрифты, тема, вкладки

## Summary
Основа для экранов из прототипов: пять нижних вкладок (Главная, Гонки, Райды, Маршруты, Календарь)
со своей панелью по прототипу, шрифты Playfair Display + Inter, светлая Jersey Aura / тёмная Night Ride
по системной теме, нативный splash с линией маршрута, экраны-заглушки. Тестовая инфраструктура мобилки.

## Motivation
Следующие задачи (Главная, онбординг) ложатся на готовые навигацию, тему и типографику. Spec:
`docs/tasks/2026-10-22-mobile-app-shell/task.md`.

## Changes
- **mobile:** `src/app/_layout.tsx` (шрифты, splash), `src/app/(tabs)/*` (навигатор + 5 заглушек),
  `src/components/{tab-bar,screen-placeholder}.tsx`, `src/theme/{theme,fonts}.ts`, splash PNG light/dark, `app.json`.
- **design-tokens:** `typography`, `fontWeights`, `FontFace`/`TextStyleToken` (вес связан с ролью), `size.tabBarHeight`, `size.tabIndicator`.
- **i18n:** строки вкладок, разделов, заглушки.
- **tests:** jest-expo + Testing Library 14 — вкладки, переключение, стили активной вкладки, тёмная тема, splash/шрифты, типографика.

## Testing
- `pnpm check` — PASS (format, lint, arch:check, typecheck 9/9, test 14/14).
- `pnpm --filter @on-bike/mobile test` — 3 suites, 12 tests PASS, без warnings.
- Android, Expo Go 58.0.5: Главная в Playfair/Inter, панель вкладок, переход на «Райды» — OK.
- NOT VERIFIED: нативный splash (в Expo Go не показывается), тёмная тема на устройстве, iOS.

## Migrations / Env / Config
- Новые зависимости mobile: `@expo-google-fonts/{inter,playfair-display}` (импорт по начертаниям — в бандле только 6 файлов);
  dev: `jest`, `jest-expo`, `@testing-library/react-native@14`, `test-renderer`, `@react-native/jest-preset`, `@types/jest`.
- `pnpm-workspace.yaml` → `allowBuilds['@parcel/watcher']: false` — нативная сборка из исходников не нужна (транзитивно от jest-haste-map, есть prebuilt).
- `apps/mobile/jest.config.js` → `customExportConditions: ['@on-bike/source', 'require', 'react-native']` — workspace-пакеты из исходников, как в Metro.
- Типы jest подключаются в тестах через `/// <reference types="jest" />` (TS 6: `types` по умолчанию пустой), не в tsconfig приложения.
- Миграций и env нет.

## Risks
- Splash проверен только тестами и PNG; на устройстве нужен dev build (`build:preview`).
- Иконок во вкладках нет (в прототипе — [ASSUMPTION]) — follow-up.

## Acceptance checklist
- [x] 1. Splash держится до загрузки шрифтов, затем Главная — тест `root-layout.test.tsx` (на устройстве — NOT VERIFIED).
- [x] 2. 5 вкладок в порядке прототипа, переключение, активная — ink 600 + полоса 2 px, `role=tab` + `selected` — тесты + Android.
- [x] 3. Заголовки заглушек — Playfair Display — тест + Android.
- [x] 4. Тёмная системная тема → Night Ride (экран, панель) — тест (на устройстве — NOT VERIFIED).
- [x] 5. Нет UI-литералов и hex в TSX; `pnpm check` зелёный; тесты мобилки в `pnpm test`.

## Review summary
- pass 1: Codex — APPROVE (MEDIUM 1, LOW 1); Claude independent-reviewer — APPROVE (MEDIUM 3, LOW 3). Все исправлены.
- pass 2: Claude — APPROVE, pass 1 RESOLVED; 2 LOW по тестам исправлены автором (повторно не ревьюились).
- CRITICAL/HIGH — нет. Подробно: `findings.md`.
