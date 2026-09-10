import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientService } from '../reepay-client';
import { FxService } from './fx.service';

describe('FxService', () => {
  let service: FxService;
  let moduleRef: TestingModule;
  let auth: {
    assertSensitivePin: jest.Mock<Promise<void>, [string, string]>;
  };
  let reepay: {
    post: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
  };
  let audit: {
    record: jest.Mock<void, [Record<string, unknown>]>;
  };

  beforeEach(async () => {
    auth = {
      assertSensitivePin: jest.fn<Promise<void>, [string, string]>(),
    };
    reepay = {
      post: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
    };
    audit = {
      record: jest.fn<void, [Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: AuthService, useValue: auth },
        { provide: ReepayClientService, useValue: reepay },
        { provide: MoneyMovementAuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(FxService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates EUR funding quote with authenticated user customerId and PIN check', async () => {
    reepay.post.mockResolvedValueOnce({ quoteId: 'quote-id' });

    await expect(
      service.createWalletFundingQuote(
        'user-id',
        'eur',
        { amount: '250.00', pin: '1234' },
        'request-id',
        'idem-key',
      ),
    ).resolves.toEqual({ quoteId: 'quote-id' });

    expect(auth.assertSensitivePin).toHaveBeenCalledWith('user-id', '1234');
    expect(audit.record).toHaveBeenCalledWith({
      action: 'wallet.eur.quote',
      userId: 'user-id',
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      amount: '250.00',
      currency: 'EUR',
      destinationType: 'EUR_WALLET',
    });
    expect(reepay.post).toHaveBeenCalledWith('/v1/wallet/eur/quote', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        customerId: 'user-id',
        amount: '250.00',
      },
    });
  });

  it('creates USDC funding quote through Reepay wallet route', async () => {
    reepay.post.mockResolvedValueOnce({ quoteId: 'quote-id' });

    await service.createXafToUsdcQuote(
      'user-id',
      { amount: '100.00', pin: '1234' },
      'request-id',
      'idem-key',
    );

    expect(reepay.post).toHaveBeenCalledWith('/v1/wallet/usdc/quote', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        customerId: 'user-id',
        amount: '100.00',
      },
    });
  });

  it('confirms wallet funding by quoteId and does not send customerId from frontend', async () => {
    reepay.post.mockResolvedValueOnce({ status: 'processing' });

    await expect(
      service.confirmWalletFunding(
        'user-id',
        'eur',
        { quoteId: 'quote-id', pin: '1234' },
        'request-id',
        'idem-key',
      ),
    ).resolves.toEqual({ status: 'processing' });

    expect(auth.assertSensitivePin).toHaveBeenCalledWith('user-id', '1234');
    expect(reepay.post).toHaveBeenCalledWith('/v1/wallet/eur/confirm', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        quoteId: 'quote-id',
      },
    });
  });
});
