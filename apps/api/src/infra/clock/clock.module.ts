import { Global, Module } from '@nestjs/common';

/** Источник «сейчас» для бизнес-логики: TTL сравниваются с ним, а не с now() в SQL — тесты фиксируют время. */
export interface Clock {
  now(): Date;
}

export const CLOCK = Symbol('CLOCK');

export const systemClock: Clock = { now: () => new Date() };

@Global()
@Module({
  providers: [{ provide: CLOCK, useValue: systemClock }],
  exports: [CLOCK],
})
export class ClockModule {}
