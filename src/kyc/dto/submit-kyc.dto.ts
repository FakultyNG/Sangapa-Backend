import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SubmitKycDto {
  @IsString()
  @MaxLength(80)
  documentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentNumber?: string;

  @IsUrl({ require_tld: false })
  frontImageUrl!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  backImageUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  selfieImageUrl?: string;
}
