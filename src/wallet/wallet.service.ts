import { Injectable } from '@nestjs/common';

import { ReepayClientException, ReepayClientService } from '../reepay-client';
import {
  ReepayFundingInstructions,
  ReepayRecentTransactions,
  ReepayWalletBalance,
  ReepayWalletDetails,
  TotalWalletSummary,
  WalletFetchError,
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
    const [xaf, eur, usdc] = await Promise.allSettled([
      this.getXafWallet(customerId, requestId),
      this.getEurWallet(customerId, requestId),
      this.getUsdcWallet(customerId, requestId),
    ]);
    const walletErrors: TotalWalletSummary['walletErrors'] = {
      xaf: this.getWalletError(xaf),
      eur: this.getWalletError(eur),
      usdc: this.getWalletError(usdc),
    };
    const filteredErrors = Object.fromEntries(
      Object.entries(walletErrors).filter(([, error]) => error),
    ) as NonNullable<TotalWalletSummary['walletErrors']>;
    const partial = Object.keys(filteredErrors).length > 0;

    return {
      customerId,
      wallets: {
        xaf: xaf.status === 'fulfilled' ? xaf.value : null,
        eur: eur.status === 'fulfilled' ? eur.value : null,
        usdc: usdc.status === 'fulfilled' ? usdc.value : null,
      },
      sourceOfTruth: 'REEPAY',
      ...(partial ? { partial, walletErrors: filteredErrors } : {}),
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

  private getWalletError(
    result: PromiseSettledResult<ReepayWalletDetails>,
  ): WalletFetchError | undefined {
    if (result.status === 'fulfilled') {
      return undefined;
    }

    if (result.reason instanceof ReepayClientException) {
      const response = result.reason.getResponse();
      if (this.isRecord(response) && this.isRecord(response.error)) {
        return {
          code: typeof response.error.code === 'string' ? response.error.code : 'REEPAY_ERROR',
          message:
            typeof response.error.message === 'string'
              ? response.error.message
              : 'Unable to fetch wallet from Reepay',
        };
      }
    }

    return {
      code: 'WALLET_FETCH_FAILED',
      message:
        result.reason instanceof Error ? result.reason.message : 'Unable to fetch wallet from Reepay',
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
