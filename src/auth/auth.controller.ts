import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../common/types/authenticated-request';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { PublicUser } from '../users/users.service';
import {
  AuthService,
  AuthTokens,
  BiometricChallengeResponse,
  BiometricCredentialResponse,
  OtpChallengeResponse,
  PinVerificationResponse,
} from './auth.service';
import { BiometricChallengeDto } from './dto/biometric-challenge.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshSessionDto } from './dto/refresh-session.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { ResendEmailOtpDto } from './dto/resend-email-otp.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { UnlockWithPinDto } from './dto/unlock-with-pin.dto';
import { UpdateBiometricSettingDto } from './dto/update-biometric-setting.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<OtpChallengeResponse> {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<PublicUser> {
    return this.auth.verifyEmail(dto);
  }

  @Post('resend-email-otp')
  resendEmailOtp(@Body() dto: ResendEmailOtpDto): Promise<OtpChallengeResponse> {
    return this.auth.resendEmailOtp(dto.email);
  }

  @Post('login')
  login(@Req() request: AuthenticatedRequest, @Body() dto: LoginDto): Promise<AuthTokens> {
    return this.auth.login(dto, request);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshSessionDto): Promise<AuthTokens> {
    return this.auth.refresh(dto.refreshToken, dto.pin);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser() user: AuthenticatedUser): Promise<{ success: true }> {
    return this.auth.logout(user.sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): Promise<PublicUser> {
    return this.auth.me(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    return this.auth.updateProfile(user.id, dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto): Promise<OtpChallengeResponse> {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: RequestPasswordResetDto): Promise<OtpChallengeResponse> {
    return this.auth.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto): Promise<{ success: true }> {
    return this.auth.confirmPasswordReset(dto);
  }

  @Post('forgot-password/confirm')
  confirmForgotPassword(@Body() dto: ConfirmPasswordResetDto): Promise<{ success: true }> {
    return this.auth.confirmPasswordReset(dto);
  }

  @Post('unlock/pin')
  unlockWithPin(@Body() dto: UnlockWithPinDto): Promise<AuthTokens> {
    return this.auth.unlockWithPin(dto);
  }

  @Get('biometrics')
  @UseGuards(JwtAuthGuard)
  listBiometrics(@CurrentUser() user: AuthenticatedUser): Promise<BiometricCredentialResponse[]> {
    return this.auth.listBiometrics(user.id);
  }

  @Post('biometrics/register')
  @UseGuards(JwtAuthGuard)
  registerBiometric(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterBiometricDto,
  ): Promise<BiometricCredentialResponse> {
    return this.auth.registerBiometric(user.id, dto);
  }

  @Patch('biometrics/:deviceId')
  @UseGuards(JwtAuthGuard)
  updateBiometricSetting(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateBiometricSettingDto,
  ): Promise<BiometricCredentialResponse> {
    return this.auth.updateBiometricSetting(user.id, deviceId, dto);
  }

  @Post('biometrics/challenge')
  createBiometricChallenge(
    @Body() dto: BiometricChallengeDto,
  ): Promise<BiometricChallengeResponse> {
    return this.auth.createBiometricChallenge(dto);
  }

  @Post('biometrics/login')
  loginWithBiometric(
    @Req() request: AuthenticatedRequest,
    @Body() dto: BiometricLoginDto,
  ): Promise<AuthTokens> {
    return this.auth.loginWithBiometric(dto, request);
  }

  @Post('pin/verify')
  @UseGuards(JwtAuthGuard)
  verifyPin(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VerifyPinDto,
  ): Promise<PinVerificationResponse> {
    return this.auth.verifyPin(user.id, dto.pin);
  }
}
