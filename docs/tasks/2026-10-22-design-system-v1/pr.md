# Дизайн-система v1: токены в два слоя, три темы, компоненты, скелетоны

## Summary
Все визуальные решения 19 прототипов — в `@on-bike/design-tokens`: примитивы + семантические роли для
Jersey Aura (light), Night Ride (dark) и «Протокола» (light + тёмная навигация + плотность), шкала `.t-*`,
проверка контраста WCAG. Admin и landing получают CSS из пакета (ручной дубль удалён), mobile — 13 базовых
компонентов, скелетоны и `AsyncContent`, витрина `/ui-kit` (dev). Правила проекта: всё UI — из
дизайн-системы, недостающее — расширением системы (§4.11); загрузка — скелетон, не спиннер (§4.12).

## Motivation
Дизайн-система до Главной: экраны собираются из готовых частей, без стилей «по месту».
Spec: `docs/tasks/2026-10-22-design-system-v1/task.md`. База: `feature/mobile-app-shell` (PR #1).

## Changes
- **design-tokens:** primitives / themes / typography / contrast / css; `palette` удалён.
- **api-client:** `ApiNetworkError`, `isNetworkError`.
- **mobile:** тема на ролях, `components/ui` (Button, TextAction, Kicker, SectionHeader, Pill, Chip, Banner,
  TextField, Checkbox, Toggle, SegmentedControl, Avatar/AvatarStack, EmptyState, Skeleton*), `AsyncContent`,
  `useReducedMotion`, `/ui-kit`; исправлены веса (заголовки Playfair 500, вкладки 500/600), коридор.
- **admin / landing:** CSS и шрифты из пакета, состояния статуса API по §4.12.
- **правила:** AGENTS.md §4.11–§4.12, rules, skills, reviewer, `review_contract.md`; ESLint — запрет hex и `color`.

## Testing
- `pnpm check` — PASS. Тесты: design-tokens (значения прототипов, контраст всех пар, CSS), api-client,
  admin (jsdom: загрузка / сеть / сервер / stale), mobile 52 (компоненты light/dark, a11y, скелетоны,
  reduce motion, AsyncContent, витрина).
- Android (Expo Go 58): витрина и скелетоны — OK. Браузер: admin (protocol) и landing — шрифты и тема — OK.
- NOT VERIFIED: iOS, скринридеры, reduce motion на устройстве.

## Migrations / Env / Config
- Зависимости: `@fontsource/inter`, `@fontsource/playfair-display` (admin, landing); dev — `jsdom`,
  `@testing-library/react`, `@testing-library/dom` (admin).
- ESLint: `no-restricted-syntax` (hex) и `no-restricted-imports` (`color`) для `apps/*/src`.
- `apps/admin/vite.config.ts`: условие `@on-bike/source` и для SSR (vitest).
- Миграций и env нет.

## Risks / Deviations (task.md §8.2)
- Дорожка выключенного тумблера — `border.input` вместо #CFCFCB прототипа (контраст 1.56 → 3.46). **Подтверждено человеком.**
- `paused` в mobile работает после подключения `onlineManager` + NetInfo (правило записано).

## Acceptance checklist
- [x] 1. Примитивы + семантика 3 тем, значения = CSS прототипов (тест).
- [x] 2. Контраст всех пар всех тем (тест).
- [x] 3. Admin и landing — CSS из пакета, в `index.css` нет hex.
- [x] 4. Компоненты light/dark только из ролей, роли/состояния a11y, touch target ≥ 44 (тесты).
- [x] 5. Витрина `/ui-kit`: все компоненты и состояния; в production недоступна (тест).
- [x] 5a. Скелетоны, AsyncContent, правила §4.11–§4.12.
- [x] 6. Playfair 500, вкладки 500/600, коридор #5C5C5C / #A3A3A3.
- [x] 7. `pnpm check` зелёный.

## Review summary
- Codex: pass 1 (HIGH 1, MEDIUM 2), pass 2 (HIGH 1, MEDIUM 2), pass 3 (HIGH 2) — все исправлены.
- Claude: pass 1 APPROVE (MEDIUM 3, LOW 8), pass 2 REQUEST CHANGES (HIGH 1, MEDIUM 4, LOW 5),
  pass 3 **APPROVE** (MEDIUM 1, LOW 4) — исправлены; правки после pass 3 повторно не ревьюились.
- Открытых CRITICAL/HIGH нет. Подробно: `findings.md`.
