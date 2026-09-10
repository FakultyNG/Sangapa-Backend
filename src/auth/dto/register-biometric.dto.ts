import { IsString, Length, MinLength } from 'class-validator';

export class RegisterBiometricDto {
  @IsString()
  @MinLength(8)
  deviceId!: string;

  @IsString()
  @MinLength(32)
  publicKey!: string;

  @IsString()
  @Length(4, 4)
  pin!: string;
}
