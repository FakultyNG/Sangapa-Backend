import { SessionPolicyService } from './session-policy.service';

describe('SessionPolicyService', () => {
  let service: SessionPolicyService;
  let prisma: {
    adminEnvironmentVariable: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      adminEnvironmentVariable: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new SessionPolicyService(prisma as never);
  });

  it('returns admin-managed session policy values', async () => {
    prisma.adminEnvironmentVariable.findMany.mockResolvedValueOnce([
      { key: 'SANGAPAY_ACCESS_TOKEN_TTL_SEC', value: '600' },
      { key: 'SANGAPAY_SESSION_INACTIVITY_TTL_SEC', value: '864000' },
      { key: 'SANGAPAY_APP_LOCK_TTL_SEC', value: '120' },
    ]);

    await expect(service.getPolicy()).resolves.toEqual({
      accessTokenTtlSec: 600,
      refreshTokenInactivityTtlSec: 864000,
      appLockTtlSec: 120,
    });
  });

  it('updates session policy as non-sensitive admin environment overrides', async () => {
    prisma.adminEnvironmentVariable.upsert.mockResolvedValue({});
    prisma.adminEnvironmentVariable.findMany.mockResolvedValueOnce([
      { key: 'SANGAPAY_ACCESS_TOKEN_TTL_SEC', value: '900' },
    ]);

    await service.updatePolicy('admin-id', { accessTokenTtlSec: 900 });

    expect(prisma.adminEnvironmentVariable.upsert).toHaveBeenCalledWith({
      where: { key: 'SANGAPAY_ACCESS_TOKEN_TTL_SEC' },
      create: {
        key: 'SANGAPAY_ACCESS_TOKEN_TTL_SEC',
        value: '900',
        sensitive: false,
        updatedBy: 'admin-id',
      },
      update: {
        value: '900',
        sensitive: false,
        updatedBy: 'admin-id',
      },
    });
  });
});
