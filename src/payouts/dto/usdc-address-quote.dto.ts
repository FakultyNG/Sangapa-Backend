import { IsString, Length, Matches } from 'class-validator';

export class UsdcAddressQuoteDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  network!: string;

  @IsString()
  address!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
