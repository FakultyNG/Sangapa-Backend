import { IsString, MinLength } from 'class-validator';

export class BiometricChallengeDto {
  @IsString()
  @MinLength(8)
  deviceId!: string;
}
