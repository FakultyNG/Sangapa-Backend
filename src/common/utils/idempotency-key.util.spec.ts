import { resolveIdempotencyKey } from './idempotency-key.util';

describe('resolveIdempotencyKey', () => {
  it('uses a non-empty incoming idempotency key', () => {
    expect(resolveIdempotencyKey(' incoming-key ')).toBe('incoming-key');
  });

  it('generates a UUID when no usable key is provided', () => {
    expect(resolveIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(resolveIdempotencyKey('   ')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
