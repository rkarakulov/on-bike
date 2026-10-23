# Findings — onbike-web (F5b) — pass 1 — reviewer: claude
base: origin/main   commits: origin/main..7b2ca4d (11 коммитов, рабочее дерево чистое, кроме неотслеживаемого `.idea/`)
verdict: APPROVE

## Evidence ревьюера
- `pnpm check` (локально, 2026-10-23) — EXIT 0; turbo 13/13 (все задачи — попадание в кеш turbo по входам HEAD):
  app 27 наборов / 120 тестов (native + web + server), api, contracts, api-client и т.д. зелёные.
- CI PR #9 (`gh pr checks 9`, head `7b2ca4d`): `check`, `secrets`, `web` — pass. Лог job `web`: Playwright
  `8 passed`, включая «с API › регистрация → письмо → подтверждение → вход; вход переживает перезагрузку (cookie)»
  — сценарий с API в CI реально выполняется, не `skip`.
- CSRF сверен по исходнику `node_modules/@nestjs/core/security/cross-origin-protection.js` (12.2.0): алгоритм Go
  `CrossOriginProtection`, хук `onRequest` Fastify до middleware/парсинга тела; `same-site` с другого порта проходит
  только через `trustedOrigins` (= `CORS_ORIGINS`), в проде список пуст. Cookie: `AbstractHttpAdapter.setCookie/
  clearCookie` (сериализация с проверкой RFC 6265), `@Cookies` парсит заголовок сам — пакеты не нужны.
- `sessions.refresh_token_hash` — UNIQUE (`drizzle/0002_identity.sql`): ротация/отзыв по хешу — индексный поиск.

## Проверено по измерениям (без замечаний)
- **Correctness/серверный авторитет:** ротация одним условным `UPDATE … RETURNING` (не отозвана, не истекла,
  пользователь не удалён), срок не продлевается, access ≤ срока сессии; гонка — int-тест 5 параллельных → `[200, 401×4]`.
- **Безопасность:** refresh web — только `Set-Cookie __Secure-onbike_rt; Path=/v1/auth/session; HttpOnly; Secure;
  SameSite=Strict`, без `Domain`; тело web — `CookieSession` (int- и e2e-проверка точного набора ключей);
  клиент дополнительно режет `refreshToken` (`CookieSession.parse`); `no-store` ставится до обработчика (в т.ч. на 401);
  мусор в cookie → 401 до лимитера и БД; ответы 401 одинаковы (тест на 6 причин); 429 cookie не трогает;
  токены не логируются (контроллер/сервис без логов, `console.warn` клиента — только `error.name`).
  CORS `credentials: true` только при непустом списке; trailing-slash/путь в `CORS_ORIGINS` отсекает zod-схема.
- **Contracts-first/старые native:** `sessionTransport` необязателен, по умолчанию `body` → прежний `Session`
  (int-тест «без транспорта»); `AnySession` — `Session` первым.
- **SSR:** сторы и `api` в рендере/на уровне модуля не вызываются; на сервере статус `unknown` → скелетон, без
  персональных данных; `/auth/verify/*` — без `loader`, без `og:url`, токена нет в `<meta>` (e2e); `og:url` только
  из `WEB_ORIGIN`.
- **Гарды/native-регрессии:** корень ждёт только шрифты, splash скрывается после гидрации обоих сторов;
  `resumeOnLaunch` реактивен (эффект в `register.tsx`), поэтому поздняя гидрация не ломает возврат на «Подтвердите e-mail».
- **E2E/CI:** фильтр консоли узкий (401 только для URL refresh; `ERR_CONNECTION_REFUSED` только без API и только
  на origin API); actions — по SHA, mailpit — тег + digest; секреты в workflow — фиктивные, gitleaks зелёный.
- **copier update:** `.copier-answers.yml` `_commit: v0.2.0`; маркеров конфликтов нет; on-bike-отличия (TZ в jest,
  Playfair, `lead?`, identity-переменные, CORS+CSRF вместо блока CORS шаблона) сохранены; удалённые файлы шаблона
  перечислены в §12.
- **Placement:** развилки только файлами `.web.ts`; один `configureOnBikeHttp`; без новых зависимостей API.
- **Миграции/BullMQ/аудит:** схема БД не менялась; задач очереди не добавлено; ротация/выход — не аудитируемые
  решения (§8.3 п. 6) — согласуется с правилами on-bike.
- **`.claude/settings.json` (формально):** JSON валиден; `ask` — корректный ключ внутри `permissions`; приоритет
  deny > ask > allow, поэтому `rm -rf`/DROP/TRUNCATE теперь спрашиваются. `gh pr merge` убран из `deny`, в `allow` его
  нет — в обычном режиме он будет спрашивать подтверждение (формулировка коммита «разрешён» = «не запрещён»).
  См. LOW-4 про документацию.

---

### [MEDIUM] 429 от refresh на web трактуется как «не вошёл» — пользователь с живой cookie видит регистрацию
- **status:** fixed (pass 1) — 401 → не вошёл; 429/сеть/5xx → повторы (429 через `retryAfterSec`), затем статус `unavailable` с «Повторить» (`AsyncContent`), не signedOut; task.md §8.2.
- **file:** apps/app/src/features/auth/session-persistence.web.ts
- **location:** `restoreSession`, строки 24–31 (`catch { return undefined; }`)
- **problem:** любой сбой refresh, включая `429 RATE_LIMITED` (и 5xx), превращается в `undefined` → стор
  `signedOut` → гард `(tabs)` редиректит на `/register`. Это расходится с договорённостью S4 → S3b в §12
  («429 — не выход (повтор позже)»). Набор `session-persistence.web.test.ts` 429 не покрывает.
- **why_it_matters:** лимит — 60 refresh/мин на IP (`IDENTITY_POLICY.refreshPerIpLimit`), а refresh идёт на каждую
  загрузку/вкладку вошедшего пользователя. За общим IP (CGNAT мобильных операторов, офис) лимит достижим; пользователь
  с действующей сессией получает форму регистрации, а попытка «зарегистрироваться заново» даёт `EMAIL_TAKEN`
  (входа по паролю до слайса 2 нет). Сессия при этом жива и вернётся только после ручной перезагрузки.
- **evidence:** `return CookieSession.parse(await withRefreshLock(() => api.refreshSession()));` в `try`, `catch {
  return undefined; }`; §12 S4: «401 refresh приходит с `clearCookie` — signedOut; 429 — не выход (повтор позже)».
- **recommended_fix:** различать причину: `ApiHttpError` со статусом 401 → `undefined`; 429 → подождать
  `details.retryAfterSec` (под тем же Web Lock) и повторить один раз, либо оставить статус `unknown`/ошибку с повтором
  (§4.12) вместо `signedOut`. Добавить web-тест «429 → не signedOut». Сеть — как решено в task.md (signedOut без очистки cookie).

### [MEDIUM] Строгая ротация без окна повтора: потерянный ответ refresh = необратимый выход на web
- **status:** risk accepted — task.md §8 «Строгая ротация без окна повтора», follow-up слайс 2 (окно повтора 30–60 с через предыдущий хеш).
- **file:** apps/api/src/modules/identity/identity.repository.ts (+ apps/api/src/modules/identity/session.service.ts)
- **location:** `rotateSession` (≈ строки 302–324), `SessionService.rotate`
- **problem:** старый хеш заменяется сразу; если сервер закоммитил ротацию, а браузер не принял ответ (повторный F5 /
  закрытие вкладки во время запроса, обрыв мобильной сети), следующая загрузка шлёт старую cookie → 401 →
  `clearCookie`. На web refresh выполняется на **каждой** загрузке страницы, поэтому окно риска регулярное, а не редкое.
  В §8 task.md записан только риск двух вкладок (снят Web Lock); сценарий «ответ потерян» не упомянут ни в рисках,
  ни в follow-up слайса 2.
- **why_it_matters:** до слайса 2 входа по паролю нет — пользователь web теряет доступ к аккаунту полностью
  (повторная регистрация того же e-mail — отказ). Для native (body) клиента та же логика заработает в слайсе 2.
- **evidence:** `.set({ refreshTokenHash: rotation.nextTokenHash }).where(and(eq(sessions.refreshTokenHash,
  rotation.tokenHash), …))` — предыдущий хеш не сохраняется; контроллер на 401 по cookie — `this.cookie.clear(reply)`.
- **recommended_fix:** в рамках F5b — минимум зафиксировать риск в §8 и follow-up слайса 2 рядом с reuse detection
  (окно повтора: хранить `previous_refresh_token_hash` + `rotated_at` и в течение ~30–60 с отвечать на старый токен
  новой ротацией той же сессии; это и база для reuse detection). Альтернатива без миграции — не ротировать, пока access
  ещё жив (но access на web только в памяти, поэтому окно повтора предпочтительнее).

### [LOW] 401 без предъявленной cookie всё равно шлёт `Set-Cookie` сброса — гонка с poll другой вкладки
- **status:** fixed (pass 1) — вместе с Codex HIGH: сброс только предъявленной cookie + общий Web Lock на refresh/poll/выход.
- **file:** apps/api/src/modules/identity/session.controller.ts
- **location:** `refresh`, строки 44–52 (`if (isDomainError(error) && error.status === 401) this.cookie.clear(reply)`)
- **problem:** сброс отправляется и тогда, когда cookie в запросе не было (аноним на каждой загрузке). Если в это
  время в другой вкладке ответ `registration/poll` выставил свежую cookie, а ответ анонимного refresh обработан позже,
  `Max-Age=0` удаляет только что выданную сессию (poll идёт вне Web Lock).
- **why_it_matters:** редкая, но тихая потеря входа сразу после подтверждения e-mail; плюс лишний `Set-Cookie` на
  каждый анонимный запрос.
- **evidence:** `const token = cookieToken(cookieValue); if (!token) throw domainError('UNAUTHORIZED', 401);` → `catch` →
  `this.cookie.clear(reply)` независимо от `cookieValue === undefined`.
- **recommended_fix:** сбрасывать только если cookie была предъявлена (`cookieValue !== undefined`); обновить ожидание
  `isCleared` для случая «нет cookie» в `session.int.test.ts` / `session.controller.test.ts`.

### [LOW] §12 утверждает «`.claude/settings.json` (HEAD) = рендер», после `7b2ca4d` это отличие от шаблона
- **status:** fixed (pass 1) — task.md §12 «Права Claude Code (M)»; сам файл не менялся.
- **file:** docs/tasks/2026-10-23-onbike-web/task.md
- **location:** §12, строки 494 и 669/696 (`.claude/settings.json` (HEAD) = рендер)
- **problem:** коммит `7b2ca4d` перенёс `rm -rf`/DROP/TRUNCATE в `ask`, убрал `gh pr merge` из `deny` и переформатировал
  `extraKnownMarketplaces` — файл больше не совпадает с рендером `v0.2.0`, но в перечне локальных отличий его нет.
- **why_it_matters:** Documentation Sync (§10/§12): следующий `copier update` даст конфликт в файле, который перечень
  называет «как в шаблоне»; разбирающий конфликт может молча вернуть `deny` или потерять `ask`.
- **evidence:** `git diff origin/main...HEAD -- .claude/settings.json` (+`ask`, −`gh pr merge*`, многострочный `source`).
- **recommended_fix:** добавить `.claude/settings.json` в §12 «Корень и CI (M)» с описанием отличия (или вынести
  правку прав в базу app-foundation как follow-up).

## NOT VERIFIED
- Ручной смоук в браузере (мобильные Chrome/Safari, установка PWA) — человек; Safari по `http` Secure-cookie не хранит.
- `expo export -p android` и локальный `build:web` ревьюером не запускались (web-сборка подтверждена CI job `web`).
- Chromium Playwright (`PW_CHANNEL=chromium`) с префиксом `__Secure-` на `http://127.0.0.1` — не проверялся (как в §8.2).
