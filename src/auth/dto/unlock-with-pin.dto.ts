import { IsString, Length } from 'class-validator';

export class UnlockWithPinDto {
  @IsString()
  refreshToken!: string;

  @IsString()
  @Length(4, 4)
  pin!: string;
}
