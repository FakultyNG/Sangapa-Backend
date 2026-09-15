import { IsString, Matches } from 'class-validator';

export class PreviewXafDepositDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  network!: string;
}
