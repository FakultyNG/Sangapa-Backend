import { IsString, Matches } from 'class-validator';

export class EurWiseTagQuoteDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  wiseTag!: string;
}
