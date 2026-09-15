import { Global, Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminGuard } from './admin.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionPolicyService } from './session-policy.service';

@Global()
@Module({
  imports: [EmailModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AdminGuard, SessionPolicyService],
  exports: [AuthService, JwtAuthGuard, AdminGuard, SessionPolicyService],
})
export class AuthModule {}
