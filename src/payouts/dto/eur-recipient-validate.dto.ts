import { IsString, Length, Matches } from 'class-validator';

export class EurRecipientValidateDto {
  @IsString()
  iban!: string;

  @IsString()
  beneficiaryName!: string;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
