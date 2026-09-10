import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReepayClientModule } from '../reepay-client';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';

@Module({
  imports: [ReepayClientModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, JwtAuthGuard],
})
export class BeneficiariesModule {}
