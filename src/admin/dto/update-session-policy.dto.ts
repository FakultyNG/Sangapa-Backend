import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateSessionPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  accessTokenTtlSec?: number;

  @IsOptional()
  @IsInt()
  @Min(300)
  @Max(2592000)
  refreshTokenInactivityTtlSec?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86400)
  appLockTtlSec?: number;
}
