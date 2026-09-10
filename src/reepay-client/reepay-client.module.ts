import { Module } from '@nestjs/common';

import { ReepayClientService } from './reepay-client.service';

@Module({
  providers: [ReepayClientService],
  exports: [ReepayClientService],
})
export class ReepayClientModule {}
