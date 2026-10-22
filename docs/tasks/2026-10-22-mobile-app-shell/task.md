# 1. Title

Каркас мобильного приложения: splash, шрифты, тема, нижние вкладки, экраны-заглушки

# 2. Goal

Дать основу, на которую ложатся все экраны из прототипов: навигация по пяти разделам, фирменные
шрифты, светлая/тёмная тема, нативный splash. Следующая задача — Главная (отдельный `/develop-task`).
PRD/epics в `docs/product/` пока нет — источник: прототипы `key-home`, `key-onboarding` (splash).

# 3. Scope

- `apps/mobile`: нативный splash (линия маршрута + accent-точка старта, светлый и тёмный варианты).
- Шрифты Playfair Display (500, 600) и Inter (400, 500, 600, 700) через `expo-font`; splash держится,
  пока шрифты не загружены.
- Тема по системной схеме: Jersey Aura (light) / Night Ride (dark) из `@on-bike/design-tokens`.
- Типографика: текстовые стили (display, title, body, label, …) в `@on-bike/design-tokens`,
  маппинг «стиль + вес → загруженный шрифт» в `apps/mobile`.
- Нижние вкладки: Главная, Гонки, Райды, Маршруты, Календарь. Своя панель вкладок по прототипу:
  активная — ink-метка 600 и 2 px ink-полоса по верхнему краю; accent во вкладках не используется.
- Пять экранов-заглушек: заголовок раздела (Playfair) + нейтральный текст «скоро».
- Строки — `@on-bike/i18n`. Тестовая инфраструктура мобилки: jest-expo + Testing Library.

# 4. Out of Scope

- Содержимое Главной (top bar, колокольчик, «Личная линия», section heroes) — следующая задача.
- Онбординг, авторизация, опрос, геопозиция, deep links объектов.
- Иконки вкладок (в прототипе помечены [ASSUMPTION]) — follow-up.
- Ручной выбор темы в настройках (сейчас только системная).

# 5. Architecture Context

- Приложения / пакеты: `apps/mobile`, `packages/design-tokens`, `packages/i18n`.
- API, contracts, миграции, очереди — не затронуты.

# 5.1 Placement & Reuse Gate

- Цвета, отступы, размеры — только `@on-bike/design-tokens` (`palette`, `space`, `size`).
- Типографика (размер, межстрочный, вес) — новые токены в `@on-bike/design-tokens`, общие с вебом;
  имена загруженных файлов шрифтов (`PlayfairDisplay_600SemiBold`) — только в `apps/mobile/src/theme`.
- Строки — только `@on-bike/i18n`; литералы UI в TSX запрещены.
- Навигация — `Tabs` из `expo-router` с `tabBar`; без прямых зависимостей на `@react-navigation/*`.
- Код вне `src/app/` — компоненты в `src/components`, тема в `src/theme`.

# 6. Relevant Files

- `apps/mobile/src/app/_layout.tsx` — корень: шрифты, splash, тема, Stack.
- `apps/mobile/src/app/(tabs)/_layout.tsx` — навигатор вкладок.
- `apps/mobile/src/app/(tabs)/{index,races,rides,routes,calendar}.tsx` — заглушки.
- `apps/mobile/src/components/tab-bar.tsx` — своя панель вкладок.
- `apps/mobile/src/components/screen-placeholder.tsx` — общий вид заглушки.
- `apps/mobile/src/theme/*` — тема, шрифты, текстовые стили.
- `apps/mobile/app.json` — splash (light/dark), имя.
- `packages/design-tokens/src/index.ts` — типографика.
- `packages/i18n/src/ru.ts` — строки вкладок и заглушек.

# 7. Implementation Notes

- На Android `fontWeight` не выбирает начертание кастомного шрифта — вес задаётся отдельным
  `fontFamily` на каждое начертание.
- Expo Go не видит шрифты из config plugin, поэтому `useFonts` в рантайме.
- Splash-картинки генерируются из SVG (sharp) и коммитятся как PNG.

# 8. Risks / Assumptions / Open Questions

- [ASSUMPTION] Порядок вкладок по прототипу: Главная, Гонки, Райды, Маршруты, Календарь.
- [ASSUMPTION] Название продукта на splash не выводится (в прототипе — плейсхолдер RACING-PLATFORM).
- [ASSUMPTION] Текст заглушки: «Раздел появится в одной из ближайших версий.»

# 8.1 Requirements Consistency

Нет находок.

# 8.2 Deviations from spec

- Фон сцены вкладок (`sceneStyle`) задан цветом темы — по находке ревью, чтобы ленивая вкладка не мигала белым в Night Ride. В scope §3 (тема) не противоречит.
- Тип начертаний в design-tokens сужен по роли (`FontFace`): `display` — 500/600, `text` — 400–700. Принято по находке ревью M3.

# 8.3 Security checklist

Security boundary не затронут.

# 9. Acceptance Criteria

1. Приложение открывается на splash (светлый/тёмный по системе) и показывает Главную после загрузки шрифтов.
2. Пять вкладок в заданном порядке; нажатие переключает экран; активная вкладка — ink 600 и 2 px полоса сверху,
   `accessibilityRole="tab"` и `accessibilityState.selected`.
3. Каждая заглушка показывает название своего раздела шрифтом Playfair Display.
4. Тёмная системная тема → Night Ride (фон, текст, панель вкладок).
5. Нет литералов UI-строк и hex-цветов в TSX мобилки; `pnpm check` зелёный, тесты мобилки запускаются в `pnpm test`.

# 10. Documentation Impact

docs не требуются: поведение описано в прототипах; обновить `.claude/rules/mobile.md`, если меняются
команды тестов мобилки.

# 11. Implementation Context

ENTRY POINTS: `apps/mobile/src/app/_layout.tsx`.
FILES TO MODIFY: см. §6. FILES TO READ: `.claude/rules/mobile.md`, `.claude/skills/mobile-expo/SKILL.md`.
TYPES & SCHEMAS: токены `palette`, `space`, `size`, новые `typography`.
TESTS: jest-expo + `expo-router/testing-library` (`renderRouter`) — вкладки, переключение, тема.
OUT OF SCOPE: §4.

# 12. Outcome

- **Changes:**
  - `apps/mobile`: корневой layout (шрифты через `useFonts`, удержание нативного splash, лог ошибки шрифтов);
    вкладки `(tabs)` на `expo-router/js-tabs` со своей панелью `TabBar`; 5 экранов-заглушек `ScreenPlaceholder`;
    тема `src/theme` (`themeFor`/`useTheme`, `fontAssets`, `fontFamilyFor`, `textStyle`);
    splash light/dark (`splash-route-*.png`) в `app.json`; удалены пример `src/app/index.tsx` и `splash-icon.png`.
  - `packages/design-tokens`: `typography`, `fontWeights`, `FontFace`, `TextStyleToken`, `size.tabBarHeight`, `size.tabIndicator`.
  - `packages/i18n`: строки вкладок, разделов, заглушки.
  - Тесты мобилки: jest-expo + Testing Library 14 (`pnpm --filter @on-bike/mobile test` в составе `pnpm test`).
- **Files touched:** см. `git diff main --stat`.
- **Docs updated:** не требуются (§10).
- **Tests:** `pnpm check` — PASS (format, lint, arch, typecheck 9/9, test 14/14); mobile — 3 suites, 12 tests PASS.
  Ручная проверка на Android (Xiaomi, Expo Go 58.0.5): Главная-заглушка в Playfair/Inter, 5 вкладок, переключение на «Райды» — OK.
  NOT VERIFIED: нативный splash (Expo Go его не показывает — нужна dev-сборка), тёмная тема на устройстве, iOS.
- **Open follow-ups:** иконки вкладок; ручной выбор темы в настройках; Главная по прототипу `key-home` (следующая задача).
