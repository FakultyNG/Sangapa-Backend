import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientService } from '../reepay-client';
import { PayoutsService } from './payouts.service';

describe('PayoutsService', () => {
  let service: PayoutsService;
  let moduleRef: TestingModule;
  let auth: {
    assertSensitivePin: jest.Mock<Promise<void>, [string, string]>;
  };
  let reepay: {
    get: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
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
      get: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
      post: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
    };
    audit = {
      record: jest.fn<void, [Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: AuthService, useValue: auth },
        { provide: ReepayClientService, useValue: reepay },
        { provide: MoneyMovementAuditService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(PayoutsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('validates EUR recipient through Reepay after PIN check without forwarding pin', async () => {
    reepay.post.mockResolvedValueOnce({ valid: true });

    await expect(
      service.validateEurRecipient(
        'user-id',
        { iban: 'DE89370400440532013000', beneficiaryName: 'Ada User', pin: '1234' },
        'request-id',
      ),
    ).resolves.toEqual({ valid: true });

    expect(auth.assertSensitivePin).toHaveBeenCalledWith('user-id', '1234');
    expect(reepay.post).toHaveBeenCalledWith('/v1/payouts/eur/recipient/validate', {
      requestId: 'request-id',
      body: {
        iban: 'DE89370400440532013000',
        beneficiaryName: 'Ada User',
      },
    });
  });

  it('creates EUR IBAN quote with authenticated user customerId and idempotency key', async () => {
    reepay.post.mockResolvedValueOnce({ quoteId: 'quote-id' });

    await service.createEurIbanQuote(
      'user-id',
      {
        amount: '250.00',
        iban: 'DE89370400440532013000',
        beneficiaryName: 'Ada User',
        bankName: 'Test Bank',
        beneficiaryAddress: '1 Test Street',
        pin: '1234',
      },
      'request-id',
      'idem-key',
    );

    expect(reepay.post).toHaveBeenCalledWith('/v1/payouts/eur/iban/quote', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        customerId: 'user-id',
        amount: '250.00',
        iban: 'DE89370400440532013000',
        beneficiaryName: 'Ada User',
        bankName: 'Test Bank',
        beneficiaryAddress: '1 Test Street',
      },
    });
    expect(audit.record).toHaveBeenCalledWith({
      action: 'payout.eur.iban.quote',
      userId: 'user-id',
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      amount: '250.00',
      currency: 'EUR',
      destinationType: 'EUR_IBAN',
    });
  });

  it('confirms EUR WiseTag payout by quoteId only', async () => {
    reepay.post.mockResolvedValueOnce({ status: 'processing' });

    await service.confirmEurWiseTagPayout(
      'user-id',
      { quoteId: 'quote-id', pin: '1234' },
      'request-id',
      'idem-key',
    );

    expect(auth.assertSensitivePin).toHaveBeenCalledWith('user-id', '1234');
    expect(reepay.post).toHaveBeenCalledWith('/v1/payouts/eur/wisetag/confirm', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        quoteId: 'quote-id',
      },
    });
  });

  it('creates USDC address quote through Reepay only', async () => {
    reepay.post.mockResolvedValueOnce({ quoteId: 'quote-id' });

    await service.createUsdcAddressQuote(
      'user-id',
      {
        amount: '100.00',
        network: 'POLYGON',
        address: '0x0000000000000000000000000000000000000000',
        pin: '1234',
      },
      'request-id',
      'idem-key',
    );

    expect(reepay.post).toHaveBeenCalledWith('/v1/payouts/usdc/address/quote', {
      requestId: 'request-id',
      idempotencyKey: 'idem-key',
      body: {
        customerId: 'user-id',
        amount: '100.00',
        network: 'POLYGON',
        address: '0x0000000000000000000000000000000000000000',
      },
    });
  });

  it('fetches payout status from Reepay', async () => {
    reepay.get.mockResolvedValueOnce({ id: 'payout-id' });

    await service.getPayout('payout-id', 'request-id');
    expect(reepay.get).toHaveBeenCalledWith('/v1/payouts/payout-id', {
      requestId: 'request-id',
    });
  });
});
