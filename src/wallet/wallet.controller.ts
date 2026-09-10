import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RecentTransactionsQueryDto } from './dto/recent-transactions-query.dto';
import {
  ReepayFundingInstructions,
  ReepayRecentTransactions,
  ReepayWalletBalance,
  ReepayWalletDetails,
  TotalWalletSummary,
} from './wallet.types';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('balance')
  balance(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayWalletBalance> {
    return this.wallet.getBalance(user.id, request.id);
  }

  @Get('xaf')
  xaf(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayWalletDetails> {
    return this.wallet.getXafWallet(user.id, request.id);
  }

  @Get('eur')
  eur(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayWalletDetails> {
    return this.wallet.getEurWallet(user.id, request.id);
  }

  @Get('usdc')
  usdc(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayWalletDetails> {
    return this.wallet.getUsdcWallet(user.id, request.id);
  }

  @Get('summary')
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<TotalWalletSummary> {
    return this.wallet.getSummary(user.id, request.id);
  }

  @Get('funding-instructions')
  fundingInstructions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayFundingInstructions> {
    return this.wallet.getFundingInstructions(user.id, request.id);
  }

  @Get('recent-transactions')
  recentTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: RecentTransactionsQueryDto,
  ): Promise<ReepayRecentTransactions> {
    return this.wallet.getRecentTransactions(user.id, query.limit ?? 20, request.id);
  }
}
