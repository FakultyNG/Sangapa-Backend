import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateXafDepositDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;

  @IsString()
  network!: string;

  @IsString()
  @Matches(/^\d{8,15}$/)
  phoneNumber!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  expiresInSec?: number = 900;

  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  pin!: string;
}
