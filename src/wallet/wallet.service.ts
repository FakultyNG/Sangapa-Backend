import { Injectable } from '@nestjs/common';

import { ReepayClientService } from '../reepay-client';
import {
  ReepayFundingInstructions,
  ReepayRecentTransactions,
  ReepayWalletBalance,
  ReepayWalletDetails,
  TotalWalletSummary,
} from './wallet.types';

@Injectable()
export class WalletService {
  constructor(private readonly reepay: ReepayClientService) {}

  getBalance(customerId: string, requestId?: string): Promise<ReepayWalletBalance> {
    return this.reepay.get<ReepayWalletBalance>('/v1/wallet/balance', {
      query: { customerId },
      requestId,
    });
  }

  getXafWallet(customerId: string, requestId?: string): Promise<ReepayWalletDetails> {
    return this.reepay.get<ReepayWalletDetails>('/v1/wallet/xaf', {
      query: { customerId },
      requestId,
    });
  }

  getEurWallet(customerId: string, requestId?: string): Promise<ReepayWalletDetails> {
    return this.reepay.get<ReepayWalletDetails>('/v1/wallet/eur', {
      query: { customerId },
      requestId,
    });
  }

  getUsdcWallet(customerId: string, requestId?: string): Promise<ReepayWalletDetails> {
    return this.reepay.get<ReepayWalletDetails>('/v1/wallet/usdc', {
      query: { customerId },
      requestId,
    });
  }

  async getSummary(customerId: string, requestId?: string): Promise<TotalWalletSummary> {
    const [xaf, eur, usdc] = await Promise.all([
      this.getXafWallet(customerId, requestId),
      this.getEurWallet(customerId, requestId),
      this.getUsdcWallet(customerId, requestId),
    ]);

    return {
      customerId,
      wallets: {
        xaf,
        eur,
        usdc,
      },
      sourceOfTruth: 'REEPAY',
    };
  }

  getFundingInstructions(
    customerId: string,
    requestId?: string,
  ): Promise<ReepayFundingInstructions> {
    return this.reepay.get<ReepayFundingInstructions>('/v1/wallet/funding-instructions', {
      query: { customerId },
      requestId,
    });
  }

  getRecentTransactions(
    customerId: string,
    limit: number,
    requestId?: string,
  ): Promise<ReepayRecentTransactions> {
    return this.reepay.get<ReepayRecentTransactions>('/v1/wallet/recent-transactions', {
      query: { customerId, limit },
      requestId,
    });
  }
}
