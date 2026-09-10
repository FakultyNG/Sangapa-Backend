import { IsEnum, IsString, MaxLength } from 'class-validator';
import { KycIdCardType } from '@prisma/client';

export class SubmitTierTwoKycDto {
  @IsString()
  @MaxLength(80)
  countryOfOrigin!: string;

  @IsString()
  @MaxLength(80)
  countryOfResidence!: string;

  @IsEnum(KycIdCardType)
  idCardType!: KycIdCardType;
}
