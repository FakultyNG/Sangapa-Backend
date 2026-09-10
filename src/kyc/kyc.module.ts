import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../common/uploads/uploads.module';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [KycController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
