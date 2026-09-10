import { Module } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReepayClientModule } from '../reepay-client';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [ReepayClientModule],
  controllers: [WalletController],
  providers: [WalletService, JwtAuthGuard],
  exports: [WalletService],
})
export class WalletModule {}
