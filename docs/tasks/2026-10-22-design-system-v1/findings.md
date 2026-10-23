# Findings — design-system-v1 — pass 1 — reviewer: codex
base: feature/mobile-app-shell   commits: working tree
verdict: REQUEST CHANGES

### [HIGH] Контраст выключенного тумблера ниже порога и исключён из проверок
- **file:** packages/design-tokens/src/contrast.ts
- **location:** contrastPairs(), строки 35–52
- **problem:** Проверка не включает роли `control.*`. В светлой теме выключенный Toggle использует дорожку `#CFCFCB` и белый бегунок на белом фоне: контраст обеих границ составляет только 1.56 вместо требуемых 3.
- **why_it_matters:** Нарушены требования контраста UI и AC2. Существующий тест проходит, хотя активный элемент управления не соответствует установленному порогу; исключение для disabled здесь неприменимо.
- **evidence:** Прямой вызов `contrastRatio()` с ролями темы вернул 1.5624 для `control.track / surface.default` и `control.thumb / control.track` в light и protocol. `Toggle` применяет эти роли без дополнительной контрастной рамки.
- **recommended_fix:** Добавить проверки границ и состояний Toggle. Обеспечить контраст ≥3 семантической рамкой или согласованной корректировкой ролей, сохранив проверку обеих тем.

### [MEDIUM] Высота области ввода TextField меньше видимой рамки
- **file:** apps/mobile/src/components/ui/text-field.tsx
- **location:** styles.input и styles.text, строки 101–109
- **problem:** `minHeight: size.fieldHeight` задан внешнему `View`. Сам `TextInput` центрируется через `alignItems: 'center'`, имеет `paddingVertical: 0` и не получает минимальную высоту.
- **why_it_matters:** Видимое поле высотой 52 не обеспечивает область ввода ≥44 из AC4. Нажатие на свободное место над или под текстом не передаётся в `TextInput` и не фокусирует поле.
- **evidence:** `styles.text` содержит только `{ flex: 1, paddingVertical: 0 }`; при горизонтальном flex `flex: 1` заполняет ширину. Внешний контейнер не имеет обработчика фокусировки.
- **recommended_fix:** Задать самому `TextInput` минимальную высоту из токенов и растянуть его по высоте поля. Проверить фокусировку нажатием у верхнего и нижнего краёв на устройстве.

### [MEDIUM] Витрина не содержит всех заявленных состояний
- **file:** apps/mobile/src/components/ui-kit.tsx
- **location:** UiKit(), строки 46–110
- **problem:** Отсутствуют примеры Button `onPhoto`, TextAction `disabled`, disabled Checkbox и Toggle, отдельного Avatar с фотографией и Pill с тоном `accent`.
- **why_it_matters:** AC5 требует показать все компоненты во всех состояниях. Эти варианты нельзя проверить через предусмотренную витрину.
- **evidence:** Раздел кнопок содержит только обычные и disabled Button; оба TextAction активны. Checkbox и Toggle представлены единственным интерактивным экземпляром, Avatar используется только внутри AvatarStack без `uri`.
- **recommended_fix:** Добавить недостающие варианты; `onPhoto` показать на подходящей подложке, фотографию Avatar — через локальную фикстуру.

NOT VERIFIED: `pnpm check` не запускался в среде с файловой системой только для чтения. Нативная отрисовка и фактические размеры областей нажатия на устройстве не проверены.
---

# Findings — design-system-v1 — pass 1 — reviewer: claude (independent-reviewer)
base: feature/mobile-app-shell   commits: working tree
verdict: APPROVE

- [MEDIUM] Тумблер выкл. ниже WCAG 1.4.11, `control.*` не в контраст-парах → **исправлено** (track = border.input, 4 пары control.*). Совпадает с Codex HIGH.
- [MEDIUM] Плотность «Протокола», stroke, inset, radius не попадают в CSS → **исправлено** (`--density-*` у protocol, `--stroke-*`, `--inset-*`, `--radius-*`).
- [MEDIUM] Витрина без части состояний → **исправлено** (onPhoto, disabled TextAction/Checkbox/Toggle, Pill accent, Avatar с фото; тест — все разделы + disabled). Совпадает с Codex MEDIUM.
- [LOW] Тесты обещают больше, чем проверяют → **исправлено** (рамка Pill, полоса Banner light/dark, touch target Checkbox/Toggle/Segment, hitSlop Chip, dark TextField).
- [LOW] Неполный набор dark-переменных в тесте прототипа → **исправлено** (+7 переменных).
- [LOW] Арифметика вместо токенов → **исправлено** (`inset.segment`, `inset.caption`, `size.avatarOverlap`, `size.emptyPadding`, `motion.pressedOpacity`).
- [LOW] Нет запрета импорта примитива `color` → **исправлено** (`no-restricted-imports`).
- [LOW] Латиница Verified/Start → оставлено намеренно (названия уровней продукта), task.md §8.2.
- [LOW] Нажимаемый Banner теряет срочность → **исправлено** (`accessibilityLiveRegion` для warning/error).
- [LOW] TextField: двойное озвучивание подписи и «!»; Checkbox disabled → **исправлено**.
- [LOW] theme-color лендинга только светлый → **исправлено** (два meta по prefers-color-scheme).

Codex pass 1: HIGH контраст тумблера, MEDIUM высота TextInput, MEDIUM витрина → **исправлено** все три.
После pass 1 добавлено по запросу человека: скелетоны + AsyncContent + правила §4.11/§4.12 (см. task.md §8.2).


---

# Findings — design-system-v1 — pass 2 — reviewer: codex
base: feature/mobile-app-shell   commits: working tree
verdict: REQUEST CHANGES

### [HIGH] Асинхронный блок admin не выполняет новые требования к состояниям
- **file:** apps/admin/src/App.tsx
- **location:** 7–12
- **problem:** При загрузке health-запроса отображается `…`, при ошибке — `down` без возможности повторить запрос.
- **why_it_matters:** Изменение вводит обязательные скелетоны и ошибку с повтором для каждого асинхронного блока, но затронутый экран этим требованиям не соответствует.
- **evidence:** `health.data?.status ?? (health.isError ? 'down' : '…')`; AGENTS.md §4.12 и `.claude/rules/web.md` требуют скелетон по раскладке и ошибку с повтором.
- **recommended_fix:** Добавить скелетон строки статуса через `.skeleton`, локализованное состояние ошибки и кнопку вызова `health.refetch()`. Заголовок оставить видимым.

### [MEDIUM] Скелетон запускает анимацию до получения настройки reduce motion
- **file:** apps/mobile/src/theme/motion.ts
- **location:** 5–12; apps/mobile/src/components/ui/skeleton.tsx:25–42
- **problem:** Начальное значение `reduced` равно `false`. Пока асинхронный `isReduceMotionEnabled()` не завершился, `SkeletonGroup` уже запускает `Animated.loop`, даже если уменьшение движения включено.
- **why_it_matters:** AC 5a требует статичного скелетона при reduce motion. Текущий тест проверяет только итоговую opacity и пропускает первоначальный запуск анимации.
- **evidence:** `useState(false)` → асинхронный `.then(...)`; эффект `SkeletonGroup` немедленно вызывает `loop.start()` при `reduced === false`.
- **recommended_fix:** До получения настройки использовать статичное состояние. Добавить тест с отложенным ответом `isReduceMotionEnabled()`, проверяющий отсутствие запуска анимации до ответа и после ответа `true`.

### [MEDIUM] Веб-клиенты не загружают шрифты дизайн-системы
- **file:** packages/design-tokens/src/primitives.ts
- **location:** fontStack; apps/admin/src/design-system.ts:7–12
- **problem:** Генератор объявляет семейства Inter и Playfair Display, но ни admin, ни landing не подключают файлы этих шрифтов.
- **why_it_matters:** На устройстве без установленных шрифтов новый заголовок `.t-panel-title` отображается запасным шрифтом вместо Playfair Display. Типографика веба визуально расходится с прототипами.
- **evidence:** `fontStack.display` начинается с `'Playfair Display'`; в `apps/admin/index.html`, `Base.astro` и стилях обоих приложений отсутствуют `@font-face` или подключение шрифтов. `installDesignSystem()` добавляет только сгенерированный CSS.
- **recommended_fix:** Подключить локальные файлы Inter и Playfair Display с используемыми начертаниями в обоих веб-клиентах.

Проверки: `pnpm check` завершился успешно, exit code 0; typecheck и тесты воспроизведены из кеша Turborepo. Визуальная проверка на устройствах и соответствие исходным 19 прототипам — **NOT VERIFIED**: устройства не запускались, файлы прототипов в репозитории не найдены.

API, contracts, миграции, очереди, серверный расчёт результатов и аудит не затронуты. Нарушений границ модулей проверка не обнаружила.
**Статус Codex pass 2 (исправлено автором):** HIGH admin-статус без скелетона/повтора → `.skeleton`, ошибка с повтором, данные не прячутся; MEDIUM пульс до ответа reduce motion → `useReducedMotion(): boolean | null`, пульс только при `false`; MEDIUM веб без шрифтов → `@fontsource/*` (самохостинг) в admin и landing.

---

# Findings — design-system-v1 — pass 2 — reviewer: claude (independent-reviewer)
base: feature/mobile-app-shell   commits: working tree
verdict: REQUEST CHANGES

Pass 1: все находки RESOLVED.

- [HIGH] AsyncContent прячет загруженные данные при ошибке фонового обновления; нет `fetchStatus: 'paused'` → **исправлено**: данные приоритетнее ошибки (баннер «Данные могли устареть» + повтор), paused без данных — «Нет соединения», ошибка сервера (`ApiHttpError`) — «Не удалось загрузить»; тесты на оба случая.
- [MEDIUM] Тесты reduce motion тавтологичны → **исправлено**: отложенный ответ системы, три случая (неизвестно / выкл → пульс / вкл → нет).
- [MEDIUM] §4.11/§4.12 нет в общем контракте ревью, severity расходится → **исправлено**: измерения и severity (HIGH) в `review_contract.md`, агент ссылается на контракт.
- [MEDIUM] Формулировки §4.12 расходятся → **исправлено**: одна каноническая формулировка в AGENTS.md §4.12 (спиннеры запрещены везде вместо контента; мутации — состояние кнопки, индикатор в кнопке допустим; сеть vs сервер; видны заголовок, навигация, фильтры), rules/skills ссылаются на неё.
- [MEDIUM] admin-статус против §4.12 → исправлено ранее (Codex pass 2) и выровнено под каноническую формулировку.
- [LOW] `surface.skeleton` = `surface.raised` → задокументировано: скелетон ставится на surface.default (как `.skel` в прототипах).
- [LOW] AsyncContent: `empty`/`isEmpty` раздельно, нет live region, мёртвый `error.network` → **исправлено** (`empty: { when, render }`, `accessibilityLiveRegion`, ключ удалён).
- [LOW] README без motion/скелетона/AsyncContent/шрифтов → **исправлено**.
- [LOW] Disabled Toggle не отличим → **исправлено** (дорожка `surface.disabled`).
- [LOW] §4.11 без списка исключений; 1440px в admin → **исправлено** (исключения раскладки в §4.11, `density.compact.contentMaxWidth`).


---

# Findings — design-system-v1 — pass 3 — reviewer: codex
base: feature/mobile-app-shell   commits: working tree
verdict: REQUEST CHANGES

### [HIGH] Скелетон статуса API имеет нулевую высоту
- **file:** apps/admin/src/index.css
- **location:** 22–32; apps/admin/src/App.tsx:28–29
- **problem:** Пустому `span.status-value` задана только ширина. Высота отсутствует, содержимого нет, а `align-items: center` исключает растягивание по высоте.
- **why_it_matters:** На первой загрузке скелетон невидим: вместо значения статуса остаётся пустое место. Нарушен AGENTS.md §4.12.
- **evidence:** `.status-value` содержит `display: inline-block` и `width`; `.t-meta` задаёт шрифт, но не высоту блока; `.skeleton` добавляет только фон и анимацию.
- **recommended_fix:** Задать высоту скелетона из токена типографики через CSS-переменную пакета. Проверить в браузере ненулевые размеры и видимость при незавершённом запросе.

### [HIGH] Ошибка фонового обновления admin не позволяет повторить запрос
- **file:** apps/admin/src/App.tsx
- **location:** 19–27
- **problem:** При наличии данных и ошибке обновления показывается только текст «Данные могли устареть». Кнопка повтора существует исключительно в ветке без данных.
- **why_it_matters:** Пользователь не может повторить неудачное обновление через интерфейс. AGENTS.md §4.12 требует сохранить данные и показать баннер с повтором.
- **evidence:** Ветка `health.data !== undefined && health.isError` возвращает `span role="status"` без обработчика; `onClick={retry}` находится в альтернативной ветке на строке 35.
- **recommended_fix:** Добавить над сохранёнными данными уведомление с кнопкой `health.refetch()`. Проверить сценарий: успешный запрос → ошибка обновления → нажатие «Повторить».

NOT VERIFIED: `pnpm check` не запускался в среде с файловой системой только для чтения. Визуальная проверка в браузере и на устройствах не выполнялась; соответствие исходным 19 прототипам не проверено — их файлы в репозитории не найдены.
**Статус Codex pass 3 (исправлено автором):** HIGH скелетон статуса нулевой высоты → внутри неразрывный пробел, высота = строка `.t-meta`; HIGH нет повтора при ошибке обновления → кнопка «Повторить» рядом с «Данные могли устареть». Добавлены DOM-тесты admin (jsdom + Testing Library): загрузка, сеть, сервер, ошибка обновления с повтором.

---

# Findings — design-system-v1 — pass 3 — reviewer: claude (independent-reviewer)
base: feature/mobile-app-shell   commits: working tree
verdict: APPROVE

Claude pass 2, Codex pass 2, Codex pass 3 — все RESOLVED (скелетон admin проверен в Chromium: 48×18).

- [MEDIUM] Любая ошибка кроме `ApiHttpError` = «Нет соединения» (в т.ч. ZodError старого клиента) → **исправлено автором**: `ApiNetworkError` + `isNetworkError` в api-client; «Нет соединения» — только сеть и `paused`, остальное — «Не удалось загрузить»; тесты в api-client, AsyncContent, admin.
- [LOW] `paused` в RN без `onlineManager` + NetInfo → **правило** в `.claude/rules/mobile.md`.
- [LOW] admin: `pending + paused` — бесконечный скелетон → **исправлено** (как в AsyncContent).
- [LOW] Состояния AsyncContent не на витрине → **исправлено** (сеть, сервер, stale).
- [LOW] admin `.button` без focus-visible, ширина скелетона из высоты кнопки → **исправлено** (`:focus-visible`, `size.skeletonWord`).

Правки после pass 3 (MEDIUM/LOW) повторно не ревьюились; CRITICAL/HIGH открытых нет.
