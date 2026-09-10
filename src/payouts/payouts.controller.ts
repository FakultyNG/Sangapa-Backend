import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { ConfirmPayoutDto } from './dto/confirm-payout.dto';
import { EurIbanQuoteDto } from './dto/eur-iban-quote.dto';
import { EurRecipientValidateDto } from './dto/eur-recipient-validate.dto';
import { EurWiseTagQuoteDto } from './dto/eur-wisetag-quote.dto';
import { UsdcAddressQuoteDto } from './dto/usdc-address-quote.dto';
import { PayoutsService } from './payouts.service';
import { ReepayPayout, ReepayPayoutQuote, ReepayRecipientValidation } from './payouts.types';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('eur/recipient/validate')
  validateEurRecipient(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EurRecipientValidateDto,
  ): Promise<ReepayRecipientValidation> {
    return this.payouts.validateEurRecipient(user.id, dto, request.id);
  }

  @Post('eur/iban/quote')
  createEurIbanQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EurIbanQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    return this.payouts.createEurIbanQuote(user.id, dto, request.id, idempotencyKey);
  }

  @Post('eur/iban/confirm')
  confirmEurIbanPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmPayoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    return this.payouts.confirmEurIbanPayout(user.id, dto, request.id, idempotencyKey);
  }

  @Post('eur/wisetag/quote')
  createEurWiseTagQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: EurWiseTagQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    return this.payouts.createEurWiseTagQuote(user.id, dto, request.id, idempotencyKey);
  }

  @Post('eur/wisetag/confirm')
  confirmEurWiseTagPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmPayoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    return this.payouts.confirmEurWiseTagPayout(user.id, dto, request.id, idempotencyKey);
  }

  @Post('usdc/address/quote')
  createUsdcAddressQuote(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UsdcAddressQuoteDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayoutQuote> {
    return this.payouts.createUsdcAddressQuote(user.id, dto, request.id, idempotencyKey);
  }

  @Post('usdc/address/confirm')
  confirmUsdcAddressPayout(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ConfirmPayoutDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<ReepayPayout> {
    return this.payouts.confirmUsdcAddressPayout(user.id, dto, request.id, idempotencyKey);
  }

  @Get(':id')
  getPayout(
    @Param('id') payoutId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReepayPayout> {
    return this.payouts.getPayout(payoutId, request.id);
  }
}
