# Findings — onboarding-02-sign-in

PR #15. Pass 1: Claude (independent-reviewer) и Codex — оба REQUEST CHANGES. Каждое замечание проверено
воспроизведением (падающий тест до исправления), исправлено по TDD.

## Pass 1

| # | Источник | Уровень | Замечание | Статус |
|---|---|---|---|---|
| 1 | Claude | HIGH | `SignInService.takeAttempt`: три `consume` параллельно — отказ по e-mail+IP всё равно списывает общий счётчик e-mail; один IP блокирует владельца со всех адресов | **Исправлено** (`afbe360`). Счётчики по очереди IP → e-mail+IP → e-mail до первого отказа; 429 — пауза отказавшего правила (одинаково для несуществующих адресов). Int: `email.limit` ошибок с IP A → верный пароль с IP B — 200; отказ по IP не создаёт e-mail-счётчиков |
| 2 | Codex (HIGH), Claude (LOW) | HIGH | Native: `persistSession` вне замка сессии — выход сразу после входа читает пустое хранилище, сервер не отзывается, поздняя запись возвращает сессию | **Исправлено** (`c40dce0`). `requestSignIn`: запрос, запись SecureStore и вход в памяти — одна операция под `withSessionLock`; poll (`fetchRegistrationPoll`) сохраняет сессию в той же операции; `store.signIn` — только память. Тест: задержанная запись SecureStore + выход → хранилище пусто, `signOut` с сохранённым refresh |
| 3 | Codex | HIGH | Web: выход при сбое API (сеть, 5xx) — httpOnly cookie жива, перезагрузка восстанавливает аккаунт | **Исправлено** (`c40dce0`). Признак незавершённого выхода `onbike.signOutPending` в `localStorage` (не токен; try/catch, только из эффектов): при нём `restoreSession` не восстанавливает аккаунт и повторяет `signOut`; снимается подтверждённым отзывом или явным входом. Web-тесты: сеть и 5xx, сервер всё ещё недоступен, вход снимает признак, хранилище недоступно |
| 4 | Claude | MEDIUM | IPv6: ключ лимита по полному адресу — клиент с /64 меняет суффикс и обходит IP-лимиты | **Исправлено** (`afbe360`). `rateLimitAddress`: IPv4 как есть, IPv6 — /64, IPv4-mapped — как IPv4; во всех IP-лимитах on-bike (регистрация, refresh, вход: IP и пара e-mail+IP). Unit + int. Follow-up в app-foundation — task.md §12 |
| 5 | Codex | MEDIUM | `sign-in.tsx` `toRegister` → `router.back()` к смонтированной регистрации со старым e-mail | **Исправлено** (`c40dce0`). `register.tsx`: `useFocusEffect` берёт e-mail из черновика при возврате. Тест: регистрация A → вход → B → «Создать аккаунт» → в форме B |
| 6 | Claude | LOW | Native-стор после восстановления и ротации держит `refreshToken` в памяти | **Исправлено** (`c40dce0`). `CookieSession.parse` в `restore` и `revalidate`; тесты ожидают сессию без refresh |

Проверки после исправлений: `pnpm check` — EXIT 0 (api 139, app 171); `build:web` — EXIT 0; `pnpm e2e:web` без API —
8 passed, 1 skipped; с `E2E_API=1` — 9 passed.
