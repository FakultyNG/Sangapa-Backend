import { Test, TestingModule } from '@nestjs/testing';

import { ReepayClientService } from '../reepay-client';
import { WalletService } from './wallet.service';

describe('WalletService', () => {
  let service: WalletService;
  let moduleRef: TestingModule;
  let reepay: {
    get: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
  };

  beforeEach(async () => {
    reepay = {
      get: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: ReepayClientService,
          useValue: reepay,
        },
      ],
    }).compile();

    service = moduleRef.get(WalletService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('derives customerId from caller and passes it to Reepay wallet balance', async () => {
    reepay.get.mockResolvedValueOnce({ available: '1000' });

    await expect(service.getBalance('user-id', 'request-id')).resolves.toEqual({
      available: '1000',
    });
    expect(reepay.get).toHaveBeenCalledWith('/v1/wallet/balance', {
      query: { customerId: 'user-id' },
      requestId: 'request-id',
    });
  });

  it('builds total wallet summary from XAF, EUR, and USDC wallets', async () => {
    reepay.get
      .mockResolvedValueOnce({ currency: 'XAF', available: '10000' })
      .mockResolvedValueOnce({ currency: 'EUR', available: '25.00' })
      .mockResolvedValueOnce({ currency: 'USDC', available: '10.00' });

    await expect(service.getSummary('user-id', 'request-id')).resolves.toEqual({
      customerId: 'user-id',
      wallets: {
        xaf: { currency: 'XAF', available: '10000' },
        eur: { currency: 'EUR', available: '25.00' },
        usdc: { currency: 'USDC', available: '10.00' },
      },
      sourceOfTruth: 'REEPAY',
    });
  });

  it('passes limit only from validated backend query for recent transactions', async () => {
    reepay.get.mockResolvedValueOnce({ items: [] });

    await service.getRecentTransactions('user-id', 10, 'request-id');
    expect(reepay.get).toHaveBeenCalledWith('/v1/wallet/recent-transactions', {
      query: { customerId: 'user-id', limit: 10 },
      requestId: 'request-id',
    });
  });
});
