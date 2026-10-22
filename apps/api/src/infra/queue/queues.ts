/** Имена очередей BullMQ. Задачи обязаны быть идемпотентными: ретрай не должен дублировать эффект. */
export const QUEUE = {
  trackProcessing: 'track-processing',
} as const;
