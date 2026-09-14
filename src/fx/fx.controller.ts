import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { ConfirmWalletFundingDto } from './dto/confirm-wallet-funding.dto';
import { FxRatesQueryDto } from './dto/fx-rates-query.dto';
import { CreateWalletFundingQuoteDto } from './dto/create-wallet-funding-quote.dto';
import { FxService } from './fx.service';
import { FxRatesResponse, ReepayFxQuote, ReepayWalletFundingConfirmation } from './fx.types';

@Controller()
@UseGuards(JwtAuthGuard)
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('fx/rates')
  rates(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: FxRatesQueryDto,
  ): Promise<FxRatesResponse> {
    return this.fx.getRates(user.id, query.amount ?? '1000', request.id);
  }

  @Get('fx/rates/xaf-eur')
  xafToEurRate(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: FxRatesQueryDto,
  ): Promise<ReepayFxQuote> {
    return this.fx.getRate(user.id, 'xaf-eur', query.amount ?? '1000', request.id);
  }

  @Get('fx/rates/xaf-usdc')
  xafToUsdcRate(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Query() query: FxRatesQueryDto,
  ): Promise<ReepayFxQuote> {
    return this.fx.getRate(user.id, 'xaf-usdc', query.amount ?? '1000', request.id);
  }

  @Post('wallet/eur/quote')
  createEurQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWalletFundingQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.fx.createWalletFundingQuote(user.id, 'eur', dto, request.id, idempotencyKey);
  }

  @Post('wallet/eur/confirm')
  confirmEurFunding(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmWalletFundingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayWalletFundingConfirmation> {
    return this.fx.confirmWalletFunding(user.id, 'eur', dto, request.id, idempotencyKey);
  }

  @Post('wallet/usdc/quote')
  createUsdcQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWalletFundingQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.fx.createWalletFundingQuote(user.id, 'usdc', dto, request.id, idempotencyKey);
  }

  @Post('wallet/usdc/confirm')
  confirmUsdcFunding(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmWalletFundingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayWalletFundingConfirmation> {
    return this.fx.confirmWalletFunding(user.id, 'usdc', dto, request.id, idempotencyKey);
  }

  @Post('fx/quote/xaf-eur')
  createXafToEurQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWalletFundingQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.fx.createXafToEurQuote(user.id, dto, request.id, idempotencyKey);
  }

  @Post('fx/quote/xaf-usdc')
  createXafToUsdcQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWalletFundingQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayFxQuote> {
    return this.fx.createXafToUsdcQuote(user.id, dto, request.id, idempotencyKey);
  }
}
