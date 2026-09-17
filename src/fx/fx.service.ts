import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { resolveIdempotencyKey } from '../common/utils/idempotency-key.util';
import { ReepayClientException, ReepayClientService } from '../reepay-client';
import { ConfirmWalletFundingDto } from './dto/confirm-wallet-funding.dto';
import { CreateWalletFundingQuoteDto } from './dto/create-wallet-funding-quote.dto';
import {
  FxRateError,
  FxRatePair,
  FxRatesResponse,
  ReepayFxQuote,
  ReepayWalletFundingConfirmation,
  WalletFundingCurrency,
} from './fx.types';

@Injectable()
export class FxService {
  constructor(
    private readonly auth: AuthService,
    private readonly reepay: ReepayClientService,
    private readonly audit: MoneyMovementAuditService,
  ) {}

  async createWalletFundingQuote(
    userId: string,
    currency: WalletFundingCurrency,
    dto: CreateWalletFundingQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: `wallet.${currency}.quote`,
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      amount: dto.amount,
      currency: currency.toUpperCase(),
      destinationType: `${currency.toUpperCase()}_WALLET`,
    });

    return this.reepay.post<ReepayFxQuote>(`/v1/wallet/${currency}/quote`, {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        customerId: userId,
        amount: dto.amount,
      },
    });
  }

  async confirmWalletFunding(
    userId: string,
    currency: WalletFundingCurrency,
    dto: ConfirmWalletFundingDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayWalletFundingConfirmation> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: `wallet.${currency}.confirm`,
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      currency: currency.toUpperCase(),
      destinationType: `${currency.toUpperCase()}_WALLET`,
    });

    return this.reepay.post<ReepayWalletFundingConfirmation>(`/v1/wallet/${currency}/confirm`, {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        quoteId: dto.quoteId,
      },
    });
  }

  createXafToEurQuote(
    userId: string,
    dto: CreateWalletFundingQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.createWalletFundingQuote(userId, 'eur', dto, requestId, idempotencyKey);
  }

  createXafToUsdcQuote(
    userId: string,
    dto: CreateWalletFundingQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.createWalletFundingQuote(userId, 'usdc', dto, requestId, idempotencyKey);
  }

  async getRates(userId: string, amount = '1000', requestId?: string): Promise<FxRatesResponse> {
    const [xafEur, xafUsdc] = await Promise.allSettled([
      this.getRate(userId, 'xaf-eur', amount, requestId),
      this.getRate(userId, 'xaf-usdc', amount, requestId),
    ]);
    const rateErrors: FxRatesResponse['rateErrors'] = {
      xafEur: this.getRateError(xafEur),
      xafUsdc: this.getRateError(xafUsdc),
    };
    const filteredErrors = Object.fromEntries(
      Object.entries(rateErrors).filter(([, error]) => error),
    ) as NonNullable<FxRatesResponse['rateErrors']>;
    const partial = Object.keys(filteredErrors).length > 0;

    return {
      baseCurrency: 'XAF',
      amount,
      rates: {
        xafEur: xafEur.status === 'fulfilled' ? xafEur.value : null,
        xafUsdc: xafUsdc.status === 'fulfilled' ? xafUsdc.value : null,
      },
      sourceOfTruth: 'REEPAY',
      ...(partial ? { partial, rateErrors: filteredErrors } : {}),
    };
  }

  getRate(
    userId: string,
    pair: FxRatePair,
    amount = '1000',
    requestId?: string,
  ): Promise<ReepayFxQuote> {
    const currency = pair === 'xaf-eur' ? 'eur' : 'usdc';

    return this.reepay.post<ReepayFxQuote>(`/v1/wallet/${currency}/quote`, {
      requestId,
      idempotencyKey: resolveIdempotencyKey(),
      body: {
        customerId: userId,
        amount,
      },
    });
  }

  private getRateError(result: PromiseSettledResult<ReepayFxQuote>): FxRateError | undefined {
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
              : 'Unable to fetch FX rate from Reepay',
        };
      }
    }

    return {
      code: 'FX_RATE_FETCH_FAILED',
      message:
        result.reason instanceof Error ? result.reason.message : 'Unable to fetch FX rate from Reepay',
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }
}
