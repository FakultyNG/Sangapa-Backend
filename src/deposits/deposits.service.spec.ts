import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientService } from '../reepay-client';
import { UsersService } from '../users/users.service';
import { DepositsService } from './deposits.service';

describe('DepositsService', () => {
  let service: DepositsService;
  let moduleRef: TestingModule;
  let reepay: {
    get: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
    post: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
  };
  let auth: {
    assertSensitivePin: jest.Mock<Promise<void>, [string, string]>;
  };
  let users: {
    findByIdOrThrow: jest.Mock<
      Promise<{ id: string; email: string; fullName: string | null }>,
      [string]
    >;
  };
  let audit: {
    record: jest.Mock<void, [Record<string, unknown>]>;
  };

  beforeEach(async () => {
    reepay = {
      get: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
      post: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
    };
    auth = {
      assertSensitivePin: jest.fn<Promise<void>, [string, string]>(),
    };
    users = {
      findByIdOrThrow: jest.fn<
        Promise<{ id: string; email: string; fullName: string | null }>,
        [string]
      >(),
    };
    audit = {
      record: jest.fn<void, [Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: ReepayClientService, useValue: reepay },
        { provide: AuthService, useValue: auth },
        { provide: UsersService, useValue: users },
        { provide: MoneyMovementAuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(DepositsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates XAF deposit with authenticated user customerId, PIN check, and idempotency key', async () => {
    users.findByIdOrThrow.mockResolvedValueOnce({
      id: 'user-id',
      email: 'user@example.com',
      fullName: 'Ada User',
    });
    reepay.post.mockResolvedValueOnce({
      id: 'deposit-id',
      status: 'pending',
      checkoutUrl: 'https://checkout.example/deposit-id',
      checkoutToken: 'checkout-token',
      creditedAmount: { amount: '10000', currency: 'XAF' },
      fees: {
        provider: { amount: '0', currency: 'XAF' },
        reepay: { amount: '150', currency: 'XAF' },
      },
      totalDebit: { amount: '10150', currency: 'XAF' },
    });

    await expect(
      service.createXafDeposit(
        'user-id',
        {
          amount: '10000',
          network: 'MTN_CM',
          phoneNumber: '237670000000',
          expiresInSec: 900,
          pin: '1234',
        },
        'request-id',
        'idem-key',
      ),
    ).resolves.toEqual({
      id: 'deposit-id',
      status: 'pending',
      checkoutUrl: 'https://checkout.example/deposit-id',
      checkoutToken: 'checkout-token',
      creditedAmount: { amount: '10000', currency: 'XAF' },
      fees: {
        provider: { amount: '0', currency: 'XAF' },
        reepay: { amount: '150', currency: 'XAF' },
      },
      totalDebit: { amount: '10150', currency: 'XAF' },
    });

    expect(auth.assertSensitivePin).toHaveBeenCalledWith('user-id', '1234');
    expect(audit.record).toHaveBeenCalledWith({
      action: 'deposit.xaf.create',
      userId: 'user-id',
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      amount: '10000',
      currency: 'XAF',
      destinationType: 'MTN_CM',
    });
    expect(reepay.post).toHaveBeenCalledWith('/v1/deposits/xaf', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        customerId: 'user-id',
        amount: '10000',
        network: 'MTN_CM',
        phoneNumber: '237670000000',
        fullName: 'Ada User',
        email: 'user@example.com',
        redirectUrl: undefined,
        expiresInSec: 900,
      },
    });
  });

  it('does not calculate XAF deposit fees or totals when Reepay omits them', async () => {
    users.findByIdOrThrow.mockResolvedValueOnce({
      id: 'user-id',
      email: 'user@example.com',
      fullName: null,
    });
    reepay.post.mockResolvedValueOnce({
      depositId: 'deposit-id',
      status: 'pending',
    });

    await expect(
      service.createXafDeposit(
        'user-id',
        {
          amount: '10000',
          network: 'MTN_CM',
          phoneNumber: '237670000000',
          pin: '1234',
        },
        'request-id',
        'idem-key',
      ),
    ).resolves.toEqual({
      id: 'deposit-id',
      status: 'pending',
      checkoutUrl: null,
      checkoutToken: null,
      creditedAmount: null,
      fees: {
        provider: null,
        reepay: null,
      },
      totalDebit: null,
    });
  });

  it('fetches deposit status from Reepay', async () => {
    reepay.get.mockResolvedValueOnce({ id: 'deposit-id' });

    await service.getDeposit('deposit-id', 'request-id');
    expect(reepay.get).toHaveBeenCalledWith('/v1/deposits/deposit-id', {
      requestId: 'request-id',
    });
  });

  it('verifies deposit through Reepay', async () => {
    reepay.post.mockResolvedValueOnce({ id: 'deposit-id', status: 'completed' });

    await service.verifyDeposit('deposit-id', 'request-id');
    expect(reepay.post).toHaveBeenCalledWith('/v1/deposits/deposit-id/verify', {
      requestId: 'request-id',
    });
  });
});
