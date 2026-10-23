/**
 * Имена очередей BullMQ: `{ имя: 'kebab-name' }`. Задачи обязаны быть идемпотентными — ретрай не должен
 * дублировать эффект (jobId = id события outbox, повторная отправка письма — проверка по состоянию в БД).
 */
export const QUEUE = {
  trackProcessing: 'track-processing',
  /** Письма модуля identity (подтверждение, позже — сброс пароля); jobId = id события outbox. */
  identityEmail: 'identity-email',
  /** Регламентные задачи identity по расписанию (очистка неподтверждённых). */
  identityMaintenance: 'identity-maintenance',
} as const;
