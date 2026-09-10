import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Beneficiary } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiaries: BeneficiariesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<Beneficiary[]> {
    return this.beneficiaries.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateBeneficiaryDto,
  ): Promise<Beneficiary> {
    return this.beneficiaries.create(user.id, dto, request.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') beneficiaryId: string,
  ): Promise<Beneficiary> {
    return this.beneficiaries.get(user.id, beneficiaryId);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') beneficiaryId: string,
    @Body() dto: UpdateBeneficiaryDto,
  ): Promise<Beneficiary> {
    return this.beneficiaries.update(user.id, beneficiaryId, dto);
  }

  @Delete(':id')
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') beneficiaryId: string,
  ): Promise<{ success: true }> {
    return this.beneficiaries.delete(user.id, beneficiaryId);
  }
}
