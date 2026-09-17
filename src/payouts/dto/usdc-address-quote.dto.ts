import { IsString, Matches } from 'class-validator';

export class UsdcAddressQuoteDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  network!: string;

  @IsString()
  address!: string;
}
