import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { resolveIdempotencyKey } from '../common/utils/idempotency-key.util';
import { ReepayClientService } from '../reepay-client';
import { ConfirmPayoutDto } from './dto/confirm-payout.dto';
import { EurIbanQuoteDto } from './dto/eur-iban-quote.dto';
import { EurRecipientValidateDto } from './dto/eur-recipient-validate.dto';
import { EurWiseTagQuoteDto } from './dto/eur-wisetag-quote.dto';
import { UsdcAddressQuoteDto } from './dto/usdc-address-quote.dto';
import { ReepayPayout, ReepayPayoutQuote, ReepayRecipientValidation } from './payouts.types';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly auth: AuthService,
    private readonly reepay: ReepayClientService,
    private readonly audit: MoneyMovementAuditService,
  ) {}

  async validateEurRecipient(
    userId: string,
    dto: EurRecipientValidateDto,
    requestId?: string,
  ): Promise<ReepayRecipientValidation> {
    await this.auth.assertSensitivePin(userId, dto.pin);

    return this.reepay.post<ReepayRecipientValidation>('/v1/payouts/eur/recipient/validate', {
      requestId,
      body: {
        iban: dto.iban,
        beneficiaryName: dto.beneficiaryName,
      },
    });
  }

  async createEurIbanQuote(
    userId: string,
    dto: EurIbanQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.eur.iban.quote',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      amount: dto.amount,
      currency: 'EUR',
      destinationType: 'EUR_IBAN',
    });

    return this.reepay.post<ReepayPayoutQuote>('/v1/payouts/eur/iban/quote', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        customerId: userId,
        amount: dto.amount,
        iban: dto.iban,
        beneficiaryName: dto.beneficiaryName,
        bankName: dto.bankName,
        beneficiaryAddress: dto.beneficiaryAddress,
      },
    });
  }

  async confirmEurIbanPayout(
    userId: string,
    dto: ConfirmPayoutDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.eur.iban.confirm',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      currency: 'EUR',
      destinationType: 'EUR_IBAN',
    });

    return this.reepay.post<ReepayPayout>('/v1/payouts/eur/iban/confirm', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        quoteId: dto.quoteId,
      },
    });
  }

  async createEurWiseTagQuote(
    userId: string,
    dto: EurWiseTagQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.eur.wisetag.quote',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      amount: dto.amount,
      currency: 'EUR',
      destinationType: 'EUR_WISETAG',
    });

    return this.reepay.post<ReepayPayoutQuote>('/v1/payouts/eur/wisetag/quote', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        customerId: userId,
        amount: dto.amount,
        wiseTag: dto.wiseTag,
      },
    });
  }

  async confirmEurWiseTagPayout(
    userId: string,
    dto: ConfirmPayoutDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.eur.wisetag.confirm',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      currency: 'EUR',
      destinationType: 'EUR_WISETAG',
    });

    return this.reepay.post<ReepayPayout>('/v1/payouts/eur/wisetag/confirm', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        quoteId: dto.quoteId,
      },
    });
  }

  async createUsdcAddressQuote(
    userId: string,
    dto: UsdcAddressQuoteDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.usdc.address.quote',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      amount: dto.amount,
      currency: 'USDC',
      destinationType: dto.network,
    });

    return this.reepay.post<ReepayPayoutQuote>('/v1/payouts/usdc/address/quote', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        customerId: userId,
        amount: dto.amount,
        network: dto.network,
        address: dto.address,
      },
    });
  }

  async confirmUsdcAddressPayout(
    userId: string,
    dto: ConfirmPayoutDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'payout.usdc.address.confirm',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      currency: 'USDC',
      destinationType: 'USDC_ADDRESS',
    });

    return this.reepay.post<ReepayPayout>('/v1/payouts/usdc/address/confirm', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        quoteId: dto.quoteId,
      },
    });
  }

  getPayout(payoutId: string, requestId?: string): Promise<ReepayPayout> {
    return this.reepay.get<ReepayPayout>(`/v1/payouts/${encodeURIComponent(payoutId)}`, {
      requestId,
    });
  }
}
