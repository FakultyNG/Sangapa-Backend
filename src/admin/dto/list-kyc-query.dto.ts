import { IsEnum, IsOptional } from 'class-validator';
import { KycStatus } from '@prisma/client';

export class ListKycQueryDto {
  @IsOptional()
  @IsEnum(KycStatus)
  status?: KycStatus;
}
