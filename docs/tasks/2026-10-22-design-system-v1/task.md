# 1. Title

Дизайн-система v1: токены в два слоя, три темы, CSS-переменные для веба, базовые RN-компоненты, витрина, контраст

# 2. Goal

Заложить корректную дизайн-систему до Главной: все визуальные решения из прототипов — в одном пакете
`@on-bike/design-tokens`, клиенты (mobile, admin, landing) берут их оттуда, а не переписывают руками.
Источник: CSS 19 прототипов (`:root` / `[data-theme]`, классы `.t-*`, компоненты `.btn`, `.ta`, `.kicker`,
`.bn`, `.inp`, `.cbx`, `.tgl`, `.chip`, `.pill`, `.seg`, `.ava`, `.empty`, `.wp-*`).
`DESIGN.md` / `EXPERIENCE.md`, на которые ссылаются прототипы, в репозитории нет — gap.

# 3. Scope

**Токены (`packages/design-tokens`)**
- Слой 1 — примитивы: нейтральная шкала (#FFFFFF … #0E0E0E), accent, error, success, warning; шрифтовые
  семейства; отступы `s1–s7`; размеры (touch-min 44, button 48, field 52, row-min 64, gutter 20, section-gap 28 …).
- Слой 2 — семантика по ролям (`text.primary`, `surface.raised`, `border.input`, `action.primary`,
  `status.error`, `map.corridor`, …) для тем `light` (Jersey Aura), `dark` (Night Ride), `protocol`.
- Типографика — полная шкала `.t-*` из прототипов (28 стилей: display-numeral, display-title, body,
  meta, label, button, text-action, pill, tag, tab-label, counter …) с letter-spacing и uppercase.
- Радиусы: 0 по умолчанию (квадратная эстетика), `pill` только для тумблера.
- Исправления по прототипам: `map.corridor` light #5C5C5C / dark #A3A3A3 (было наоборот); добавлены
  success/warning/surface/error-tint/scrim/hero-ink; заголовок раздела Playfair **500** 28/34;
  метка неактивной вкладки **500**, активной 600.

**Веб (admin, landing)**
- Пакет генерирует CSS: custom properties темы + классы типографики `.t-*`. Admin и landing подключают
  сгенерированное; ручной дубль в `apps/admin/src/index.css` удаляется. Admin — тема `protocol`.

**Mobile**
- Тема приложения — из семантических токенов (`useTheme()` отдаёт семантику, не примитивы).
- Компоненты в `apps/mobile/src/components/ui`: Button (primary / secondary, disabled, on-photo),
  TextAction (обычный / destructive / disabled), Kicker (+ tag), SectionHeader, Pill, Chip, Banner
  (info / warning / error), TextField (+ label, placeholder, error, disabled, focus), Checkbox, Toggle,
  SegmentedControl, Avatar (квадратный) + AvatarStack, EmptyState.
- Витрина `/ui-kit` — все компоненты во всех состояниях, только в dev-сборке.

**Тесты**
- Контраст WCAG по семантическим парам каждой темы: текст ≥ 4.5, крупный текст и UI-границы ≥ 3;
  disabled — исключение по WCAG 1.4.3.
- Компоненты: роли/состояния доступности, стили из токенов (light/dark), обработчики.

# 4. Out of Scope

- Компоненты карт/треков (route-line, corridor, surface-bar со штриховкой, «Личная линия») — нужны SVG/MapLibre,
  делаются с Главной и экранами маршрутов.
- Sheet / action sheet / нативные алерты, top bar Главной, карточки (section hero, photo hero).
- Компоненты веб-панели (таблица, KPI, кнопки `.wp-*`) — с первым экраном панели; здесь только токены `protocol`.
- Storybook; ручной выбор темы в настройках.

# 5. Architecture Context

- Пакеты: `design-tokens` (основная работа), `i18n` (строки витрины); приложения: mobile, admin, landing.
- API, contracts, миграции, очереди — не затронуты.

# 5.1 Placement & Reuse Gate

- Единственный источник значений — `@on-bike/design-tokens`; hex и px-литералы оформления в TSX/CSS приложений
  запрещены (кроме layout: flex, проценты).
- Компоненты в `packages/*` не выносим: RN-компоненты нужны только mobile (правило «пакет — когда ≥ 2 приложений»).
- CSS для веба генерируется функцией пакета, а не копируется.
- Тема мобилки отдаёт семантические роли; компоненты не обращаются к примитивам напрямую.

# 6. Relevant Files

- `packages/design-tokens/src/{primitives,themes,typography,css,contrast,index}.ts` — токены, генератор CSS, контраст.
- `apps/mobile/src/theme/{theme,fonts}.ts` — тема и шрифты на семантике.
- `apps/mobile/src/components/ui/*` — компоненты; `apps/mobile/src/app/ui-kit.tsx` — витрина.
- `apps/mobile/src/components/{tab-bar,screen-placeholder}.tsx` — перевод на семантику.
- `apps/admin/src/{main.tsx,index.css}` — подключение CSS темы `protocol`.
- `apps/landing/src/layouts/Base.astro` — подключение CSS темы `light`.

# 7. Implementation Notes

- Значения взяты из CSS прототипов (общие для всех 19 файлов); `--pg-*` и `.wp-chrome` — оформление
  страницы-галереи прототипов, не продукта — не переносим.
- RN не поддерживает `text-transform`/`letter-spacing` в em — переводим в px (`em × fontSize`), uppercase — `textTransform`.
- Витрина недоступна в production: маршрут отдаёт `Redirect` вне `__DEV__`.

# 8. Risks / Assumptions / Open Questions

- **[Q1] «Протокол» в прототипах — не отдельная палитра.** Веб-панель использует светлые токены Jersey Aura
  + более плотные размеры (кнопки 36 px, строки таблицы 36 px, h1 Playfair 500 30/36) + тёмную боковую
  навигацию (#111111 / #1A1A1A / #CFCFCB). Предложение: тема `protocol` = семантика `light` + роли `nav.*`
  + плотность (`density.compact`). Альтернатива — придумать отдельную палитру (не опирается на прототипы).
- **[Q2] Витрина** — dev-only маршрут `/ui-kit` со ссылкой с Главной-заглушки (тоже только в dev).
- [ASSUMPTION] Шкала типографики — классы `.t-*` прототипов как есть; имена переводим в camelCase.

# 8.1 Requirements Consistency

- **Противоречие в источнике:** «3 темы» (запрос) vs прототипы (Протокол = светлая палитра + плотность) →
  рекомендуемая трактовка в Q1.
- **Конфликт с кодом:** `map.corridor` и вес заголовков/вкладок в текущем коде расходятся с прототипами
  (`packages/design-tokens/src/index.ts`) → исправляем по прототипам.

# 8.2 Deviations from spec

- **Скелетоны и правила (расширение scope по запросу человека, 2026-10-22):** токены `surface.skeleton`, `motion`,
  класс `.skeleton` для веба; mobile — `SkeletonGroup` / `Skeleton` / `SkeletonText` / заготовки и `AsyncContent`
  (загрузка → ошибка с повтором → пусто → данные); правила AGENTS.md §4.11 (всё UI — из дизайн-системы,
  недостающее — расширением системы) и §4.12 (скелетон на каждой загрузке), те же правила в rules/skills и чек-листе
  independent-reviewer. Спецификация скелетона — из прототипов (`.skel` = surface, пульс 1 → .6 → 1 за 1,2 с,
  глобального спиннера нет).
- **Тумблер выкл.:** дорожка `control.track` = `border.input` (#8A8A87 / #6E6E6E) вместо #CFCFCB / #474747
  прототипа — иначе контраст 1.56 / 2.08 < 3 (WCAG 1.4.11; находка Codex HIGH, Claude MEDIUM). Подтверждено человеком 2026-10-22.
- **Подписи `Verified` / `Start`** на витрине латиницей — так названы уровни в продукте (START / VERIFIED в
  презентации и прототипах).
- **`motion.pressedOpacity` 0.8** — отклик нажатия кнопки; в статичных прототипах его нет.
- Внемасштабные отступы прототипов вынесены в токены: `inset.segment` 9, `inset.caption` 10,
  `size.avatarOverlap` 7, `size.emptyPadding` 30.

# 8.3 Security checklist

Security boundary не затронут.

# 9. Acceptance Criteria

1. `design-tokens` экспортирует примитивы и семантику для `light` / `dark` / `protocol`; значения совпадают с CSS прототипов.
2. Тест контраста: каждая семантическая пара каждой темы проходит свой порог; падение показывает пару и значение.
3. Admin и landing получают CSS-переменные и классы `.t-*` из пакета; в `apps/admin/src/index.css` нет hex-цветов.
4. Mobile: компоненты из §3 рендерятся в light и dark только из семантических токенов; у интерактивных — роль,
   `accessibilityState` (disabled / checked / selected), touch target ≥ 44.
5. Витрина `/ui-kit` показывает все компоненты во всех состояниях; в production недоступна.
5a. Скелетоны: `SkeletonGroup` (один пульс, статично при reduce motion, для скринридера — «Загрузка», busy),
    `AsyncContent` даёт загрузку / «Нет соединения» с повтором / пусто / данные; веб — `.skeleton`
    с `prefers-reduced-motion`. Правила §4.11 и §4.12 записаны в AGENTS.md, rules, skills, reviewer.
6. Заголовки разделов — Playfair 500; неактивная вкладка 500, активная 600; коридор — #5C5C5C / #A3A3A3.
7. `pnpm check` зелёный.

# 10. Documentation Impact

- `docs/architecture/README.md` — раздел «Дизайн-система»: слои токенов, темы, где что подключается.
- `.claude/rules/mobile.md`, `.claude/skills/{mobile-expo,web-ui}/SKILL.md` — «используй семантические роли и
  компоненты `components/ui`, примитивы напрямую — нельзя».

# 11. Implementation Context

ENTRY POINTS: `packages/design-tokens/src/index.ts`, `apps/mobile/src/theme/theme.ts`.
TESTS: vitest в design-tokens (значения, контраст, генератор CSS); jest-expo в mobile (компоненты, витрина).
OUT OF SCOPE: §4.

# 12. Outcome

- **Changes:**
  - `packages/design-tokens`: примитивы (`primitives.ts`: color, font, space, inset, size, stroke, radius,
    motion, density), семантика 3 тем (`themes.ts`: light / dark / protocol + nav, control, surface.skeleton),
    шкала `.t-*` (`typography.ts`), контраст WCAG (`contrast.ts`), генератор CSS (`css.ts`: переменные,
    `.t-*`, `.skeleton`, density у protocol). Старый `palette` удалён.
  - `packages/api-client`: `ApiNetworkError` + `isNetworkError` — явный признак «нет сети» для UI.
  - `apps/mobile`: тема на семантике; 13 компонентов + скелетоны в `components/ui`; `AsyncContent`;
    `useReducedMotion`; витрина `/ui-kit` (dev); вкладки/заглушки/корневой layout — на семантике и
    исправленной типографике (Playfair 500, вкладки 500/600).
  - `apps/admin`: тема protocol из пакета (`installDesignSystem`), шрифты @fontsource, статус API по §4.12;
    ручной дубль цветов удалён. `apps/landing`: CSS и шрифты из пакета, `.t-*` на странице, theme-color light/dark.
  - Правила: AGENTS.md §4.11–§4.12, rules mobile/web, skills mobile-expo/web-ui, reviewer + review_contract;
    ESLint: запрет hex и импорта примитива `color` в приложениях. Docs: `docs/architecture/README.md`.
- **Tests:** `pnpm check` — PASS (format, lint, arch, typecheck 9/9, test 14/14). design-tokens 117+,
  api-client 4, admin 6, mobile 52. Android (Expo Go): витрина, скелетоны — OK. Браузер: admin и landing —
  шрифты Playfair/Inter загружены, тема protocol / light. NOT VERIFIED: iOS, VoiceOver/TalkBack, reduce motion на устройстве.
- **Open follow-ups:** компоненты карт/треков, sheet, top bar Главной, `.wp-*` веб-панели (с первыми экранами);
  QueryClient мобилки с `onlineManager` + NetInfo; Главная по `key-home`.
