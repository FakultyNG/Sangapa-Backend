import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { DepositsService } from './deposits.service';
import { XafDepositResponse } from './deposits.types';
import { CreateXafDepositDto } from './dto/create-xaf-deposit.dto';
import { PreviewXafDepositDto } from './dto/preview-xaf-deposit.dto';

@Controller('deposits')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private readonly deposits: DepositsService) {}

  @Post('xaf')
  createXafDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateXafDepositDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<XafDepositResponse> {
    return this.deposits.createXafDeposit(user.id, dto, request.id, idempotencyKey);
  }

  @Post('xaf/preview')
  previewXafDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: PreviewXafDepositDto,
  ): Promise<XafDepositResponse> {
    return this.deposits.previewXafDeposit(user.id, dto, request.id);
  }

  @Get(':id')
  getDeposit(
    @Param('id') depositId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<XafDepositResponse> {
    return this.deposits.getDeposit(depositId, request.id);
  }

  @Post(':id/verify')
  verifyDeposit(
    @Param('id') depositId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<XafDepositResponse> {
    return this.deposits.verifyDeposit(depositId, request.id);
  }
}
