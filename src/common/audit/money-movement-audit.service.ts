import { Injectable, Logger } from '@nestjs/common';

export type MoneyMovementAuditEvent = {
  action: string;
  userId: string;
  requestId?: string;
  idempotencyKey?: string;
  amount?: string;
  currency?: string;
  destinationType?: string;
};

@Injectable()
export class MoneyMovementAuditService {
  private readonly logger = new Logger(MoneyMovementAuditService.name);

  record(event: MoneyMovementAuditEvent): void {
    this.logger.log(
      JSON.stringify({
        action: event.action,
        userId: event.userId,
        requestId: event.requestId,
        idempotencyKey: event.idempotencyKey,
        amount: event.amount,
        currency: event.currency,
        destinationType: event.destinationType,
      }),
    );
  }
}
