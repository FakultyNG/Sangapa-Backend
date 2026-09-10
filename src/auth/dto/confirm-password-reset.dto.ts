import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class ConfirmPasswordResetDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  otp!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
