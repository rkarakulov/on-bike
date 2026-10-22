# Findings — mobile-app-shell — pass 1 — reviewer: codex
base: main   commits: working tree
verdict: APPROVE

### [MEDIUM] Нет тестов жизненного цикла splash и применения тёмной темы
- **file:** apps/mobile/src/__tests__/tabs.test.tsx
- **location:** 10–17, 19–43
- **problem:** Тестовый router не подключает корневой `RootLayout`. Проверяются порядок вкладок и один переход; тест темы проверяет только `themeFor`, без рендера компонентов.
- **why_it_matters:** Регрессии удержания splash до загрузки шрифтов и применения Night Ride к экрану и панели останутся незамеченными. Это новое поведение из acceptance criteria 1 и 4.
- **evidence:** В `app` отсутствует `_layout: RootLayout`; вызовы `useFonts` и `SplashScreen.hideAsync` находятся исключительно в корневом layout. Проверок цветов отрендеренных компонентов нет.
- **recommended_fix:** Добавить тесты состояния загрузки и ошибки шрифтов с проверкой скрытия splash, а также рендер экрана и панели при тёмной системной схеме с проверкой токенов Night Ride.

### [LOW] Размеры панели заданы вне design-tokens
- **file:** apps/mobile/src/components/tab-bar.tsx
- **location:** 64–65
- **problem:** `minHeight: 49` и `height: 2` заданы непосредственно в стилях компонента.
- **why_it_matters:** Нарушен Placement & Reuse Gate §5.1 задачи: размеры должны поступать из `@on-bike/design-tokens`.
- **evidence:** `tab: { … minHeight: 49 … }`, `indicator: { … height: 2 }`; компонент импортирует только `space`.
- **recommended_fix:** Добавить соответствующие размеры в `size` пакета design-tokens и использовать их в панели.

Проверки: `pnpm check` — PASS; typecheck и тесты воспроизведены из кеша Turbo. Прямой запуск Jest — **NOT VERIFIED**: sandbox запретил запись временного haste-map (`EPERM`). Нативный запуск и переключение системной темы на устройстве — **NOT VERIFIED**.

Остальные измерения контракта проверены: дополнительных находок нет. API, совместимость серверных контрактов, серверный расчёт результатов, аудит, миграции, очереди и security boundary изменением не затронуты. Documentation Sync: правила уже описывают Jest для mobile; обновление не требуется.
---

# Findings — mobile-app-shell — pass 1 — reviewer: claude (independent-reviewer)
base: main   commits: working tree
verdict: APPROVE

- **[MEDIUM] M1 — приёмка 1, 3, 4 не покрыта тестами.** Корневой `_layout` (splash до загрузки шрифтов) не рендерится; тёмная тема проверена только через `themeFor`; не проверены Playfair у заголовка и стиль активной вкладки. Fix: тесты с тёмной схемой, `toHaveStyle`, тест корневого layout с моком `useFonts`.
- **[MEDIUM] M2 — `tab-bar.tsx:64-65`: `minHeight: 49`, `height: 2` в обход токенов** (§5.1). Fix: `size.tabBarHeight`, `size.tabIndicator`.
- **[MEDIUM] M3 — `fontFamilyFor` бросает в рендере на сочетаниях, допустимых типами** (`display` + 400/700). Fix: сузить тип начертаний по роли + тест «все стили typography разрешаются».
- **[LOW] L1 — `_layout.tsx:15-20`: ошибка загрузки шрифтов не логируется.**
- **[LOW] L2 — `tsconfig.json`: `"types": ["jest"]` на весь проект мобилки.**
- **[LOW] L3 — конфиги не описаны (`allowBuilds`, jest `customExportConditions`), неиспользуемый `splash-icon.png`.**

NOT VERIFIED: внешний вид splash/шрифтов/тёмной темы на устройстве; мигание фона ленивой вкладки в тёмной теме.

---

# Findings — mobile-app-shell — pass 2 — reviewer: claude (independent-reviewer)
base: main   commits: working tree
verdict: APPROVE

Статус pass 1: M1, M2, M3, L1, L2, L3 — RESOLVED.

- **[LOW] Тест splash не проверял `preventAutoHideAsync`.** → исправлено автором после pass 2: отдельный тест до первого `clearAllMocks`.
- **[LOW] Тест активной вкладки проверял только цвет полосы.** → исправлено автором после pass 2: высота полосы `size.tabIndicator`, метка `Inter_600SemiBold` + `ink`, неактивная — `ink2`.

Повторное ревью этих двух LOW-правок (только тесты) не проводилось.
NOT VERIFIED: native splash и смена системной темы на устройстве (Expo Go не показывает splash из app.json).
