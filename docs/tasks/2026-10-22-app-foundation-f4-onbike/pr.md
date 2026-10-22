# F4: on-bike на базе app-foundation (`@rkarakulov/*` 0.1.0)

## Summary
Общий код on-bike — инфраструктура API, тестовый стенд, дизайн-система, локализация, ядра контрактов и клиента — теперь
берётся из пакетов базы [rkarakulov/app-foundation](https://github.com/rkarakulov/app-foundation) (ADR-0004), а не живёт
копией. Поведение on-bike не меняется. Spec: `docs/tasks/2026-10-22-app-foundation-f4-onbike/task.md`.

## Changes
- **Реестр:** `.npmrc` (scope → GitHub Packages, без токена), `minimumReleaseAgeExclude` только для `@rkarakulov/*`,
  CI — `setup-node` с `registry-url`, `packages: read`; runbook — токен в `~/.npmrc`, EAS.
- **Пакеты on-bike — тонкие слои:** `design-tokens` (бренд Jersey Aura / Night Ride / «Протокол», `map`/`surfaceBar`),
  `i18n` (словарь on-bike поверх `baseMessages`), `contracts` (`defineErrorCodes`/`defineFieldErrorCodes`), `api-client`
  (`createHttpClient` + `apiErrorOf`).
- **API:** удалены `src/infra/**`, `src/common/**`, `config.module`, `http-app`; `defineEnv`, модули `api-kit`,
  `ApiExceptionFilter` со словарём on-bike, `domainError(code: ErrorCode)`; стенд — `createApiHarness`; `nodemailer` убран.
- **Mobile:** удалены копии компонентов, `AsyncContent`, темы, `calendar-date`, `text`; `configureDesignSystem` с брендом —
  первым импортом корня и `jest.setup.ts`; витрина `/ui-kit` — `UiKit` базы.
- **Документы и правила:** AGENTS.md §2/§4.11, `.claude/rules` (`paths:` security/db на новых путях), скилы, контракт
  ревью, architecture, design.md.

## Testing
- `pnpm check` — PASS: api 62, mobile 75, design-tokens 114, contracts 21, api-client 11, i18n 5, admin 6, tracks 2
  (меньше, чем до F4: удалены тесты-дубли, которые теперь в базе; перечень — task.md §12).
- `db:generate` — «No schema changes»; dist API + worker — регистрация → письмо → подтверждение.
- CSS admin/landing и словарь (вне `uiKit.*`) побайтно равны эталонам до F4.
- Вручную (Android, Expo Go): splash → Главная, регистрация → письмо → подтверждение → вход — OK.
- NOT VERIFIED: iOS-пикер даты (`locale="ru"` вместо `ru-RU`), EAS Build.

## Migrations / Env / Config
- Миграций нет. Новая настройка у разработчика: `~/.npmrc` + `NODE_AUTH_TOKEN` (runbook). CI — `GITHUB_TOKEN`
  (доступ on-bike к пакетам открыт). EAS — секрет `NODE_AUTH_TOKEN` до первой сборки (follow-up).

## Risks
- API (CJS) грузит ESM-пакеты базы через require(esm), в процессе две сборки drizzle (совместимы через `entityKind`);
  CI проверяет загрузку `dist`. `apps/api/tsconfig.json` — `moduleResolution: Bundler` только для проверки типов.

## Review summary
- Codex pass 1 — APPROVE (MEDIUM 2), Claude pass 1 — APPROVE (MEDIUM 2, LOW 3); все исправлены. `findings.md`,
  `findings-codex.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
