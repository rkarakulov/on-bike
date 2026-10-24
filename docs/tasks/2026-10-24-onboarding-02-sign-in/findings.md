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

## Pass 2

Claude — APPROVE (2 LOW), Codex — REQUEST CHANGES. Каждое замечание — падающий тест до исправления, затем исправление.

| # | Источник | Уровень | Замечание | Статус |
|---|---|---|---|---|
| 1 | Codex (HIGH), Claude (LOW) | HIGH | Web: `clearSession` ставил признак `signOutPending` до Web Lock — вход/poll, державший замок, снимал его в `persistSession`; выход затем падал (сеть, 5xx) без признака, перезагрузка восстанавливала аккаунт. Проверка признака в `restoreSession` — вне замка | **Исправлено.** Выход — одна операция под Web Lock: признак → `signOut` → снятие при успехе. `persistSession` снимает признак только внутри операции входа/poll под тем же замком (выход, вставший в очередь позже, побеждает). `restoreSession` проверяет признак и решает «отозвать или refresh» внутри замка. Web-тесты: (а) вход держит замок → выход в очереди → вход завершается → выход падает → перезагрузка не восстанавливает аккаунт; (б) вкладка A стартует с признаком, B входит раньше — A не отзывает сессию B, восстанавливает её |
| 2 | Codex | MEDIUM | `useSignIn` с `networkMode: 'online'`: при офлайне (NetInfo) мутация на паузе — кнопка в «загрузке» без ошибки | **Исправлено.** Мутации онбординга (`useSignIn`, `useRegister`, `useConfirmVerification`, `useResendVerification`) — `networkMode: 'always'`: офлайн сразу даёт сетевую ошибку, баннер «Нет соединения», повтор нажатием. Тест с `onlineManager.setOnline(false)` |
| 3 | Claude | LOW | `rateLimitAddress` узнавал IPv4-mapped только в записи `::ffff:a.b.c.d` | **Исправлено.** Адрес раскрывается в 8 групп; mapped — первые шесть `0,0,0,0,0,ffff` в любой записи (`::ffff:102:304`, `0:0:0:0:0:ffff:1.2.3.4`, полная с ведущими нулями, верхний регистр). Unit: варианты mapped и не-mapped (`::fffe:…`, `64:ff9b::…` — по /64) |

Проверки после исправлений: `pnpm check` — EXIT 0 (api 139, app 174); `build:web` — EXIT 0; `pnpm e2e:web` без API —
8 passed, 1 skipped; с `E2E_API=1` — 9 passed.
