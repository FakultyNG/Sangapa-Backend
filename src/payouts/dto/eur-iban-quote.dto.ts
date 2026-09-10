import { IsOptional, IsString, Length, Matches } from 'class-validator';

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

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
