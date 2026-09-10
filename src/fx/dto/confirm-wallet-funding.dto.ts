import { IsString, Length, Matches } from 'class-validator';

export class ConfirmWalletFundingDto {
  @IsString()
  quoteId!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
