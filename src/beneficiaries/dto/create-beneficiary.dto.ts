import { BeneficiaryType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsEnum(BeneficiaryType)
  type!: BeneficiaryType;

  @IsString()
  beneficiaryName!: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  beneficiaryAddress?: string;

  @IsOptional()
  @IsString()
  wiseTag?: string;

  @IsOptional()
  @IsString()
  usdcAddress?: string;

  @IsOptional()
  @IsString()
  usdcNetwork?: string;

  @IsOptional()
  @IsBoolean()
  validateWithReepay?: boolean;
}
