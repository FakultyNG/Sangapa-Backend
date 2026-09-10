import { Injectable } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { resolveIdempotencyKey } from '../common/utils/idempotency-key.util';
import { ReepayClientService } from '../reepay-client';
import { UsersService } from '../users/users.service';
import { CreateXafDepositDto } from './dto/create-xaf-deposit.dto';
import { ReepayDeposit } from './deposits.types';

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
  ): Promise<ReepayDeposit> {
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

    return this.reepay.post<ReepayDeposit>('/v1/deposits/xaf', {
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
  }

  getDeposit(depositId: string, requestId?: string): Promise<ReepayDeposit> {
    return this.reepay.get<ReepayDeposit>(`/v1/deposits/${encodeURIComponent(depositId)}`, {
      requestId,
    });
  }

  verifyDeposit(depositId: string, requestId?: string): Promise<ReepayDeposit> {
    return this.reepay.post<ReepayDeposit>(`/v1/deposits/${encodeURIComponent(depositId)}/verify`, {
      requestId,
    });
  }
}
