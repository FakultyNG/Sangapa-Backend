import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { resolveIdempotencyKey } from '../common/utils/idempotency-key.util';
import { ReepayClientService } from '../reepay-client';
import { UsersService } from '../users/users.service';
import { CreateXafDepositDto } from './dto/create-xaf-deposit.dto';
import { MoneyAmount, ReepayDeposit, XafDepositResponse } from './deposits.types';

@Injectable()
export class DepositsService {
  constructor(
    private readonly reepay: ReepayClientService,
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly audit: MoneyMovementAuditService,
  ) {}

  async createXafDeposit(
    userId: string,
    dto: CreateXafDepositDto,
    requestId?: string,
    idempotencyKey?: string,
  ): Promise<XafDepositResponse> {
    await this.auth.assertSensitivePin(userId, dto.pin);
    const user = await this.users.findByIdOrThrow(userId);
    const resolvedIdempotencyKey = resolveIdempotencyKey(idempotencyKey);

    this.audit.record({
      action: 'deposit.xaf.create',
      userId,
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      amount: dto.amount,
      currency: 'XAF',
      destinationType: dto.network,
    });

    const deposit = await this.reepay.post<ReepayDeposit>('/v1/deposits/xaf', {
      requestId,
      idempotencyKey: resolvedIdempotencyKey,
      body: {
        customerId: user.id,
        amount: dto.amount,
        network: dto.network,
        phoneNumber: dto.phoneNumber,
        fullName: dto.fullName ?? user.fullName ?? undefined,
        email: dto.email ?? user.email,
        redirectUrl: dto.redirectUrl,
        expiresInSec: dto.expiresInSec ?? 900,
      },
    });

    return this.toXafDepositResponse(deposit);
  }

  getDeposit(depositId: string, requestId?: string): Promise<ReepayDeposit> {
    return this.reepay.get<ReepayDeposit>(`/v1/deposits/${encodeURIComponent(depositId)}`, {
      requestId,
    });
  }

  async verifyDeposit(depositId: string, requestId?: string): Promise<XafDepositResponse> {
    const deposit = await this.reepay.post<ReepayDeposit>(`/v1/deposits/${encodeURIComponent(depositId)}/verify`, {
      requestId,
    });

    return this.toXafDepositResponse(deposit);
  }

  private toXafDepositResponse(deposit: ReepayDeposit): XafDepositResponse {
    const fees = this.getRecord(deposit.fees);

    return {
      id: this.getString(deposit, ['id', 'depositId']),
      reference: this.getString(deposit, ['reference', 'depositReference', 'paymentReference']),
      amount: this.getString(deposit, ['amount']),
      currency: this.getString(deposit, ['currency']),
      status: this.getString(deposit, ['status']),
      checkoutUrl: this.getString(deposit, ['checkoutUrl']),
      checkoutToken: this.getString(deposit, ['checkoutToken']),
      expiresAt: this.getString(deposit, ['expiresAt']),
      expiresInSec: this.getNumber(deposit, ['expiresInSec']),
      creditedAmount: this.getMoneyAmount(deposit.creditedAmount),
      fees: {
        provider: this.getMoneyAmount(fees?.provider),
        reepay: this.getMoneyAmount(fees?.reepay),
      },
      totalDebit: this.getMoneyAmount(deposit.totalDebit),
    };
  }

  private getString(record: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return null;
  }

  private getNumber(record: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }

    return null;
  }

  private getMoneyAmount(value: unknown): MoneyAmount | null {
    const record = this.getRecord(value);
    if (!record) {
      return null;
    }

    const amount = record.amount;
    const currency = record.currency;

    if (typeof amount !== 'string' || typeof currency !== 'string') {
      return null;
    }

    return {
      amount,
      currency,
    };
  }

  private getRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  }
}
