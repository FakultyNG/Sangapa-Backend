import { IsString, MinLength } from 'class-validator';

export class BiometricLoginDto {
  @IsString()
  @MinLength(8)
  deviceId!: string;

  @IsString()
  @MinLength(16)
  challenge!: string;

  @IsString()
  @MinLength(16)
  signature!: string;
}
