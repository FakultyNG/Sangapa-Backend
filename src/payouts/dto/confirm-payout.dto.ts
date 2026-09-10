import { IsString, Length, Matches } from 'class-validator';

export class ConfirmPayoutDto {
  @IsString()
  quoteId!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
