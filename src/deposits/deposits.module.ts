import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientModule } from '../reepay-client';
import { UsersModule } from '../users/users.module';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';

@Module({
  imports: [AuthModule, ReepayClientModule, UsersModule],
  controllers: [DepositsController],
  providers: [DepositsService, JwtAuthGuard, MoneyMovementAuditService],
})
export class DepositsModule {}
