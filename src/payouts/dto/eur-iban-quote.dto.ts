import { IsOptional, IsString, Matches } from 'class-validator';

export class EurIbanQuoteDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  iban!: string;

  @IsString()
  beneficiaryName!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  beneficiaryAddress?: string;
}
