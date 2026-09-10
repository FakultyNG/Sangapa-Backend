import { Module } from '@nestjs/common';

import { KycModule } from '../kyc/kyc.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../common/uploads/uploads.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminController } from './admin.controller';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, UsersModule, KycModule, UploadsModule, WalletModule],
  controllers: [AdminController],
  providers: [AdminService, AdminBootstrapService],
})
export class AdminModule {}
