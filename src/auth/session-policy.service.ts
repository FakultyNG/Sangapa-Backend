import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type SessionPolicy = {
  accessTokenTtlSec: number;
  refreshTokenInactivityTtlSec: number;
  appLockTtlSec: number;
};

export type UpdateSessionPolicy = Partial<SessionPolicy>;

const DEFAULT_POLICY: SessionPolicy = {
  accessTokenTtlSec: 5 * 60,
  refreshTokenInactivityTtlSec: 5 * 24 * 60 * 60,
  appLockTtlSec: 5 * 60,
};

const POLICY_KEYS = {
  accessTokenTtlSec: 'SANGAPAY_ACCESS_TOKEN_TTL_SEC',
  refreshTokenInactivityTtlSec: 'SANGAPAY_SESSION_INACTIVITY_TTL_SEC',
  appLockTtlSec: 'SANGAPAY_APP_LOCK_TTL_SEC',
} as const;

const POLICY_LIMITS: Record<keyof SessionPolicy, { min: number; max: number }> = {
  accessTokenTtlSec: { min: 60, max: 24 * 60 * 60 },
  refreshTokenInactivityTtlSec: { min: 5 * 60, max: 30 * 24 * 60 * 60 },
  appLockTtlSec: { min: 30, max: 24 * 60 * 60 },
};

@Injectable()
export class SessionPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(): Promise<SessionPolicy> {
    const variables = await this.prisma.adminEnvironmentVariable.findMany({
      where: {
        key: {
          in: Object.values(POLICY_KEYS),
        },
      },
    });
    const byKey = new Map(variables.map((variable) => [variable.key, variable.value]));

    return {
      accessTokenTtlSec: this.resolveSeconds(
        'accessTokenTtlSec',
        byKey.get(POLICY_KEYS.accessTokenTtlSec) ?? process.env.SANGAPAY_ACCESS_TOKEN_TTL_SEC,
      ),
      refreshTokenInactivityTtlSec: this.resolveSeconds(
        'refreshTokenInactivityTtlSec',
        byKey.get(POLICY_KEYS.refreshTokenInactivityTtlSec) ??
          process.env.SANGAPAY_SESSION_INACTIVITY_TTL_SEC,
      ),
      appLockTtlSec: this.resolveSeconds(
        'appLockTtlSec',
        byKey.get(POLICY_KEYS.appLockTtlSec) ?? process.env.SANGAPAY_APP_LOCK_TTL_SEC,
      ),
    };
  }

  async updatePolicy(adminUserId: string, update: UpdateSessionPolicy): Promise<SessionPolicy> {
    const entries = Object.entries(update) as [keyof SessionPolicy, number | undefined][];

    const updates = entries.filter(
      (entry): entry is [keyof SessionPolicy, number] => typeof entry[1] === 'number',
    );

    await Promise.all(
      updates.map(([field, value]) =>
          this.prisma.adminEnvironmentVariable.upsert({
            where: { key: POLICY_KEYS[field] },
            create: {
              key: POLICY_KEYS[field],
              value: String(this.clampSeconds(field, value)),
              sensitive: false,
              updatedBy: adminUserId,
            },
            update: {
              value: String(this.clampSeconds(field, value)),
              sensitive: false,
              updatedBy: adminUserId,
            },
          }),
        ),
    );

    return this.getPolicy();
  }

  private resolveSeconds(field: keyof SessionPolicy, value: string | undefined): number {
    if (!value) {
      return DEFAULT_POLICY[field];
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return DEFAULT_POLICY[field];
    }

    return this.clampSeconds(field, Math.floor(parsed));
  }

  private clampSeconds(field: keyof SessionPolicy, value: number): number {
    const limits = POLICY_LIMITS[field];
    return Math.min(limits.max, Math.max(limits.min, value));
  }
}
