import { BadRequestException } from '@nestjs/common';

export function calculateDurationSeconds(
  startedAt: Date,
  endedAt: Date,
): number {
  const durationMs = endedAt.getTime() - startedAt.getTime();
  if (durationMs <= 0) {
    throw new BadRequestException('endedAt must be later than startedAt');
  }
  return Math.max(1, Math.floor(durationMs / 1000));
}
