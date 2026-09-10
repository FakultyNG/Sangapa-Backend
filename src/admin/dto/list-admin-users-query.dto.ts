import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  tier?: string;
}
