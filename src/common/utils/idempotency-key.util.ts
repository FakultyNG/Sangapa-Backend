import { randomUUID } from 'node:crypto';

export function resolveIdempotencyKey(idempotencyKey?: string): string {
  const trimmed = idempotencyKey?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : randomUUID();
}
