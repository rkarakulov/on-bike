# Findings — app-foundation-f4-onbike — pass 1 — reviewer: codex
base: feature/app-foundation   commits: c0adada..06450c1
verdict: APPROVE

### [MEDIUM] В runbook отсутствует настройка доступа к пакетам для EAS
- **file:** docs/runbooks/local-dev.md
- **location:** строки 7–11
- **problem:** Описана только локальная авторизация через `~/.npmrc`. Обязательная по task.md инструкция для EAS отсутствует.
- **why_it_matters:** Локальный пользовательский `.npmrc` не передаётся облачному сборщику. Одна переменная `NODE_AUTH_TOKEN` без настройки авторизации реестра не обеспечивает доступ к приватным пакетам.
- **evidence:** task.md §8 и §11 требуют инструкции для EAS; проектный `.npmrc` содержит только адрес реестра. Создание конфигурации авторизации предусмотрено только в GitHub Actions через `setup-node`.
- **recommended_fix:** Добавить в runbook отдельную инструкцию для EAS: секрет с `read:packages` и способ настройки авторизации GitHub Packages перед установкой зависимостей. Сохранить выполнение настройки человеком как оговорённый follow-up.

### [MEDIUM] Новые пути инфраструктуры неполностью охвачены security-правилом
- **file:** .claude/rules/security.md
- **location:** `paths`, строки 2–8
- **problem:** После удаления `src/infra/**` добавлены конфигурация и корневые модули, но отсутствуют `apps/api/src/db/**`, `.npmrc`, `pnpm-workspace.yaml` и `.github/workflows/**`.
- **why_it_matters:** При отдельных изменениях схемы подключения БД или доступа к приватному реестру правило безопасности не будет автоматически подключаться по этим путям.
- **evidence:** task.md §8.1 п. 1 явно перечисляет требуемые пути; текущий `paths` их не содержит.
- **recommended_fix:** Дополнить `paths` перечисленными шаблонами.

Проверено независимо: typecheck API и mobile — успешно; CSS admin/landing побайтно совпадает с базовой веткой; тексты прежнего словаря вне `uiKit.*` совпадают. Проверены установленные реализации пакетов 0.1.0, DI, контракты, обработка ошибок, outbox и вызовы компонентов. CRITICAL/HIGH не обнаружены.

NOT VERIFIED: полный `pnpm check` и `db:generate` не запускались в режиме файловой системы read-only; CI и gitleaks не проверены; Android-смоук и iOS-пикер не выполнялись.