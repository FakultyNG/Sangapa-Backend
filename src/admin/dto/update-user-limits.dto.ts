import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { UserTier } from '@prisma/client';

export class UpdateUserLimitsDto {
  @IsOptional()
  @IsEnum(UserTier)
  tier?: UserTier;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  dailyDepositLimitXaf?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/)
  monthlyDepositLimitXaf?: string;
}
