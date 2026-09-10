import { Injectable } from '@nestjs/common';

import { ReepayClientService } from '../reepay-client';
import { ReepayTransaction, ReepayTransactionList } from './transactions.types';

@Injectable()
export class TransactionsService {
  constructor(private readonly reepay: ReepayClientService) {}

  listTransactions(
    customerId: string,
    limit: number,
    cursor?: string,
    requestId?: string,
  ): Promise<ReepayTransactionList> {
    return this.reepay.get<ReepayTransactionList>('/v1/transactions', {
      query: {
        customerId,
        limit,
        cursor,
      },
      requestId,
    });
  }

  getTransaction(transactionId: string, requestId?: string): Promise<ReepayTransaction> {
    return this.reepay.get<ReepayTransaction>(
      `/v1/transactions/${encodeURIComponent(transactionId)}`,
      {
        requestId,
      },
    );
  }
}
