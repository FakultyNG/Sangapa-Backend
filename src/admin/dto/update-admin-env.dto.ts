import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateAdminEnvDto {
  @IsString()
  @Matches(/^[A-Z0-9_]+$/)
  key!: string;

  @IsString()
  @MinLength(1)
  value!: string;

  @IsOptional()
  @IsBoolean()
  sensitive?: boolean;
}
