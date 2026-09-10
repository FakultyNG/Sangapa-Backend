import { IsBoolean } from 'class-validator';

export class UpdateBiometricSettingDto {
  @IsBoolean()
  enabled!: boolean;
}
