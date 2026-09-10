import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { resolveIdempotencyKey } from '../common/utils/idempotency-key.util';
import { ReepayClientService } from '../reepay-client';
import { ConfirmWalletFundingDto } from './dto/confirm-wallet-funding.dto';
import { CreateWalletFundingQuoteDto } from './dto/create-wallet-funding-quote.dto';
import { ReepayFxQuote, ReepayWalletFundingConfirmation, WalletFundingCurrency } from './fx.types';

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
    await this.auth.assertSensitivePin(userId, dto.pin);
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
}
