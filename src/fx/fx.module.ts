import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MoneyMovementAuditService } from '../common/audit/money-movement-audit.service';
import { ReepayClientModule } from '../reepay-client';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';

@Module({
  imports: [AuthModule, ReepayClientModule],
  controllers: [FxController],
  providers: [FxService, JwtAuthGuard, MoneyMovementAuditService],
})
export class FxModule {}
