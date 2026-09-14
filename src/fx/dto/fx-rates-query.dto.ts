import { IsOptional, Matches } from 'class-validator';

export class FxRatesQueryDto {
  @IsOptional()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount?: string;
}
