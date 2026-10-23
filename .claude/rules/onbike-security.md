---
paths:
  - "apps/api/src/modules/identity/**"
  - "apps/api/src/modules/media/**"
  - "apps/app/src/features/auth/**"
---

# on-bike — зоны безопасности (дополняет `security.md`)

Эти пути — зона `security.md`, но его `paths:` (шаблон) их не покрывают: **прочитай `.claude/rules/security.md`
целиком** перед правкой. Security checklist (AuthN/AuthZ · входные данные · данные наружу · злоупотребления · секреты и
логи · аудит) обязателен в task.md; reviewer без него ставит REQUEST CHANGES.

- Пароли — argon2id. Токены — короткоживущий access + ротируемый refresh (хешем); инвалидация всех сессий при сбросе пароля.
- Ссылки verify/reset/delete — одноразовые, с TTL; открытие ссылки ничего не меняет, действие — POST по кнопке.
- Сессия в вебе (ADR-0003 п. 4): refresh — только в cookie `HttpOnly; Secure; SameSite=Strict` с узким `Path`
  (`SESSION_COOKIE` из contracts), без `Domain`, в теле ответа web его нет; access — только в памяти (не
  `localStorage`/`sessionStorage`); cookie-эндпоинты защищены CSRF (Fetch Metadata + Origin,
  `enableCsrfProtection`), CORS с credentials — только для `CORS_ORIGINS`. Native — refresh в теле, SecureStore.

- Персональные и биометрические данные (пульс, мощность, FTP, вес) — не в ответах и публичных ссылках, не в логах.
- Защита от перебора e-mail: нейтральные ответы регистрации, повтора письма и удаления аккаунта.
- Неподтверждённый аккаунт не получает полноценных токенов (AD-28) — спорный момент с V-09, решать в task.md.
- Файлы пользователей — в S3 под непредсказуемыми ключами; выдача — через подписанные URL.
- Парсеры FIT/GPX/KML работают в worker с лимитами по памяти и времени; XML — без внешних сущностей (XXE).
