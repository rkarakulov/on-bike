# Шаблон task.md

Один компактный документ, достаточный для architect, coder и reviewer.
Путь: `docs/tasks/<YYYY-MM-DD>-<slug>/task.md`. Рядом — `findings.md`, `pr.md`. Коммитятся.
Не переписывай сюда правила из `AGENTS.md` и `.claude/rules/*` проекта — ссылайся.

## 1. Title

## 2. Goal
Что меняем и зачем. Ссылка на эпик/стори из `docs/product/`, если есть.

## 3. Scope
Ключевые изменения, затронутые приложения и модули, ожидаемый результат.

## 4. Out of Scope
Что явно не делаем.

## 5. Architecture Context
- приложения / пакеты: api / app / admin / contracts / … (по `AGENTS.md` §2)
- модули API и слои: controller / service / repository / job
- изменения contracts и совместимость со старыми версиями приложения
- миграции (expand / contract), индексы
- задачи BullMQ, outbox-события

## 5.1 Placement & Reuse Gate (обязательно)
- что переиспользуем (схемы, сервисы, утилиты, компоненты, токены; пакеты `@rkarakulov/*`);
- какие дубли запрещены;
- тонкие controllers, логика — в services; чужой модуль — только через `index.ts`.

Пустой раздел — задача не готова к реализации.

## 6. Relevant Files
5–12 путей с ролью каждого.

## 7. Implementation Notes
Точки входа, ограничения, неочевидные нюансы.

## 8. Risks / Assumptions / Open Questions

## 8.1 Requirements Consistency (заполняет architect)
Нет находок — так и написать. Формат находки:
- **Противоречие в источнике:** A vs B → рекомендуемая трактовка.
- **Конфликт с инвариантом/кодом:** требование vs `AGENTS.md` §4 / `path:line` → как разрешаем.
- **Недоопределено:** тема → почему блокирует → вопрос человеку.
- **Вредное решение:** требование → последствия → 2–3 альтернативы → рекомендация.

## 8.2 Deviations from spec
Отклонение · причина · кем и когда принято · где отражено. Молчаливые отклонения запрещены.

## 8.3 Security checklist (если затронута зона из `.claude/rules/security.md`)
AuthN/AuthZ · входные данные · данные наружу · злоупотребления · секреты и логи · аудит.
Не затронута — написать «security boundary не затронут».

## 9. Acceptance Criteria
Функциональные, технические, негативные кейсы, архитектурные (placement, нет дублей).

## 10. Documentation Impact
Какие документы обновить (пути) или «docs не требуются» + почему. Новое архитектурное решение → ADR.

## 11. Implementation Context
ENTRY POINTS · FILES TO MODIFY · FILES TO READ · TYPES & SCHEMAS · TESTS · OUT OF SCOPE.

## 12. Outcome (заполняет coder)
- **Changes** по модулям
- **Files touched**
- **Docs updated**
- **Tests:** что запускалось и результат (или `NOT VERIFIED`)
- **Open follow-ups**
