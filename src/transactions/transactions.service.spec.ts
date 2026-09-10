import { Test, TestingModule } from '@nestjs/testing';

import { ReepayClientService } from '../reepay-client';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
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
        TransactionsService,
        {
          provide: ReepayClientService,
          useValue: reepay,
        },
      ],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('lists transactions using authenticated user customerId and pagination', async () => {
    reepay.get.mockResolvedValueOnce({ items: [], nextCursor: null });

    await expect(
      service.listTransactions('user-id', 25, 'cursor-1', 'request-id'),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(reepay.get).toHaveBeenCalledWith('/v1/transactions', {
      query: {
        customerId: 'user-id',
        limit: 25,
        cursor: 'cursor-1',
      },
      requestId: 'request-id',
    });
  });

  it('fetches a transaction by id through Reepay', async () => {
    reepay.get.mockResolvedValueOnce({
      id: 'transaction-id',
      status: 'completed',
      currency: 'XAF',
    });

    await service.getTransaction('transaction-id', 'request-id');
    expect(reepay.get).toHaveBeenCalledWith('/v1/transactions/transaction-id', {
      requestId: 'request-id',
    });
  });
});
