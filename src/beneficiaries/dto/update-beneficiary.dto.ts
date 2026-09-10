import { BeneficiaryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateBeneficiaryDto {
  @IsOptional()
  @IsString()
  beneficiaryName?: string;

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
  @IsEnum(BeneficiaryStatus)
  status?: BeneficiaryStatus;
}
