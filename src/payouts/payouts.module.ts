import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientModule } from '../reepay-client';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
  imports: [AuthModule, ReepayClientModule],
  controllers: [PayoutsController],
  providers: [PayoutsService, JwtAuthGuard, MoneyMovementAuditService],
})
export class PayoutsModule {}
