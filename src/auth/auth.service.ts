import { createVerify, randomBytes, randomInt, randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from '../users/dto/update-profile.dto';
import { PublicUser, UsersService } from '../users/users.service';
import { BiometricChallengeDto } from './dto/biometric-challenge.dto';
import { BiometricLoginDto } from './dto/biometric-login.dto';
import { ConfirmPasswordResetDto } from './dto/confirm-password-reset.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterBiometricDto } from './dto/register-biometric.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { UnlockWithPinDto } from './dto/unlock-with-pin.dto';
import { UpdateBiometricSettingDto } from './dto/update-biometric-setting.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtPayload } from './jwt-payload';

export type OtpChallengeResponse = {
  success: true;
  message: string;
  expiresInSec: number;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSec: number;
  user: PublicUser;
};

export type PinVerificationResponse = {
  valid: boolean;
};

export type BiometricCredentialResponse = {
  deviceId: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type BiometricChallengeResponse = {
  deviceId: string;
  challenge: string;
  expiresInSec: number;
};

const OTP_TTL_SEC = 10 * 60;
const OTP_MAX_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL_SEC = 5 * 60;
const REFRESH_TOKEN_INACTIVITY_TTL_SEC = 5 * 24 * 60 * 60;
const BIOMETRIC_CHALLENGE_TTL_SEC = 5 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly users: UsersService,
  ) {}

  async register(dto: RegisterDto): Promise<OtpChallengeResponse> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        pinHash: await bcrypt.hash(dto.pin, 12),
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
      },
    });

    await this.issueOtp(user, OtpPurpose.EMAIL_VERIFICATION, 'email verification');
    return this.otpResponse('Verification code sent to email');
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<PublicUser> {
    const user = await this.findUserByEmail(dto.email);
    await this.consumeOtp(user.id, OtpPurpose.EMAIL_VERIFICATION, dto.otp);

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
      },
    });

    return this.users.toPublicUser(verifiedUser);
  }

  async login(dto: LoginDto, request: AuthenticatedRequest): Promise<AuthTokens> {
    const user = await this.findUserByEmail(dto.email);
    await this.assertActiveVerifiedUser(user);

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user, request);
  }

  async refresh(refreshToken: string, pin: string): Promise<AuthTokens> {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    for (const session of sessions) {
      const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (!matches) {
        continue;
      }

      await this.assertActiveVerifiedUser(session.user);
      await this.assertSensitivePin(session.userId, pin);
      this.assertSessionStillActive(session.lastUsedAt, now);
      const expiresAt = this.sessionExpiresAt(now);
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastUsedAt: now,
          expiresAt,
        },
      });
      const accessToken = await this.signAccessToken(session.user, session.id);

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresInSec: ACCESS_TOKEN_TTL_SEC,
        user: this.users.toPublicUser(session.user),
      };
    }

    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  async unlockWithPin(dto: UnlockWithPinDto): Promise<AuthTokens> {
    const { session, refreshToken } = await this.findActiveSessionByRefreshToken(dto.refreshToken);
    await this.assertSensitivePin(session.userId, dto.pin);
    await this.assertActiveVerifiedUser(session.user);

    const now = new Date();
    this.assertSessionStillActive(session.lastUsedAt, now);
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        lastUsedAt: now,
        expiresAt: this.sessionExpiresAt(now),
      },
    });

    return {
      accessToken: await this.signAccessToken(session.user, session.id),
      refreshToken,
      tokenType: 'Bearer',
      expiresInSec: ACCESS_TOKEN_TTL_SEC,
      user: this.users.toPublicUser(session.user),
    };
  }

  async logout(sessionId: string): Promise<{ success: true }> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { success: true };
  }

  me(userId: string): Promise<PublicUser> {
    return this.users.getCurrentUser(userId);
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    return this.users.updateProfile(userId, dto);
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<OtpChallengeResponse> {
    const user = await this.findUserByEmail(dto.email);
    await this.issueOtp(user, OtpPurpose.PASSWORD_RESET, 'password reset');
    return this.otpResponse('Password reset code sent to email');
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto): Promise<{ success: true }> {
    const user = await this.findUserByEmail(dto.email);
    await this.consumeOtp(user.id, OtpPurpose.PASSWORD_RESET, dto.otp);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(dto.newPassword, 12),
        },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    return { success: true };
  }

  async verifyPin(userId: string, pin: string): Promise<PinVerificationResponse> {
    const user = await this.users.findByIdOrThrow(userId);
    const valid = await bcrypt.compare(pin, user.pinHash);

    return { valid };
  }

  async listBiometrics(userId: string): Promise<BiometricCredentialResponse[]> {
    const credentials = await this.prisma.biometricCredential.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return credentials.map((credential) => ({
      deviceId: credential.deviceId,
      enabled: credential.enabled,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    }));
  }

  async registerBiometric(
    userId: string,
    dto: RegisterBiometricDto,
  ): Promise<BiometricCredentialResponse> {
    await this.assertSensitivePin(userId, dto.pin);

    const existing = await this.prisma.biometricCredential.findUnique({
      where: { deviceId: dto.deviceId },
    });

    if (existing && existing.userId !== userId) {
      throw new ConflictException('Biometric device is already registered to another user');
    }

    const credential = existing
      ? await this.prisma.biometricCredential.update({
          where: { deviceId: dto.deviceId },
          data: {
            publicKey: dto.publicKey,
            enabled: true,
            challenge: null,
            challengeExpiresAt: null,
          },
        })
      : await this.prisma.biometricCredential.create({
          data: {
            userId,
            deviceId: dto.deviceId,
            publicKey: dto.publicKey,
            enabled: true,
          },
        });

    return {
      deviceId: credential.deviceId,
      enabled: credential.enabled,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    };
  }

  async updateBiometricSetting(
    userId: string,
    deviceId: string,
    dto: UpdateBiometricSettingDto,
  ): Promise<BiometricCredentialResponse> {
    const credential = await this.prisma.biometricCredential.findUnique({
      where: { deviceId },
    });

    if (!credential || credential.userId !== userId) {
      throw new BadRequestException('Biometric device not found');
    }

    const updated = await this.prisma.biometricCredential.update({
      where: { deviceId },
      data: {
        enabled: dto.enabled,
        challenge: null,
        challengeExpiresAt: null,
      },
    });

    return {
      deviceId: updated.deviceId,
      enabled: updated.enabled,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async createBiometricChallenge(dto: BiometricChallengeDto): Promise<BiometricChallengeResponse> {
    const credential = await this.prisma.biometricCredential.findUnique({
      where: { deviceId: dto.deviceId },
      include: { user: true },
    });

    if (!credential || !credential.enabled) {
      throw new UnauthorizedException('Biometric login is not enabled for this device');
    }

    await this.assertActiveVerifiedUser(credential.user);
    const challenge = randomBytes(32).toString('base64url');
    await this.prisma.biometricCredential.update({
      where: { deviceId: dto.deviceId },
      data: {
        challenge,
        challengeExpiresAt: new Date(Date.now() + BIOMETRIC_CHALLENGE_TTL_SEC * 1000),
      },
    });

    return {
      deviceId: dto.deviceId,
      challenge,
      expiresInSec: BIOMETRIC_CHALLENGE_TTL_SEC,
    };
  }

  async loginWithBiometric(
    dto: BiometricLoginDto,
    request: AuthenticatedRequest,
  ): Promise<AuthTokens> {
    const credential = await this.prisma.biometricCredential.findUnique({
      where: { deviceId: dto.deviceId },
      include: { user: true },
    });

    if (
      !credential ||
      !credential.enabled ||
      credential.challenge !== dto.challenge ||
      !credential.challengeExpiresAt ||
      credential.challengeExpiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired biometric challenge');
    }

    if (!this.verifyBiometricSignature(credential.publicKey, dto.challenge, dto.signature)) {
      throw new UnauthorizedException('Invalid biometric signature');
    }

    await this.assertActiveVerifiedUser(credential.user);
    await this.prisma.biometricCredential.update({
      where: { deviceId: dto.deviceId },
      data: {
        challenge: null,
        challengeExpiresAt: null,
      },
    });

    return this.createSession(credential.user, request);
  }

  async assertSensitivePin(userId: string, pin: string): Promise<void> {
    const result = await this.verifyPin(userId, pin);

    if (!result.valid) {
      throw new UnauthorizedException('Invalid PIN');
    }
  }

  private async createSession(user: User, request: AuthenticatedRequest): Promise<AuthTokens> {
    const refreshToken = randomUUID() + randomUUID();
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    const now = new Date();
    const expiresAt = this.sessionExpiresAt(now);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
        lastUsedAt: now,
        userAgent: request.header('user-agent'),
        ipAddress: request.ip,
      },
    });
    const accessToken = await this.signAccessToken(user, session.id);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresInSec: ACCESS_TOKEN_TTL_SEC,
      user: this.users.toPublicUser(user),
    };
  }

  private async signAccessToken(user: User, sessionId: string): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
      role: user.role,
    };

    return jwt.sign(payload, this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), {
      expiresIn: ACCESS_TOKEN_TTL_SEC,
    });
  }

  private async findActiveSessionByRefreshToken(refreshToken: string) {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    for (const session of sessions) {
      const matches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
      if (matches) {
        return { session, refreshToken };
      }
    }

    throw new UnauthorizedException('Invalid or expired refresh token');
  }

  private assertSessionStillActive(lastUsedAt: Date, now = new Date()): void {
    const inactiveForMs = now.getTime() - lastUsedAt.getTime();
    if (inactiveForMs > REFRESH_TOKEN_INACTIVITY_TTL_SEC * 1000) {
      throw new UnauthorizedException('Session expired due to inactivity');
    }
  }

  private sessionExpiresAt(now = new Date()): Date {
    return new Date(now.getTime() + REFRESH_TOKEN_INACTIVITY_TTL_SEC * 1000);
  }

  private verifyBiometricSignature(
    publicKey: string,
    challenge: string,
    signature: string,
  ): boolean {
    try {
      const verifier = createVerify('SHA256');
      verifier.update(challenge);
      verifier.end();
      return verifier.verify(publicKey, signature, 'base64');
    } catch {
      return false;
    }
  }

  private async issueOtp(user: User, purpose: OtpPurpose, purposeLabel: string): Promise<void> {
    const code = randomInt(100000, 1_000_000).toString();
    const codeHash = await bcrypt.hash(code, 12);

    await this.prisma.otpCode.updateMany({
      where: {
        userId: user.id,
        purpose,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });
    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        purpose,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
      },
    });
    await this.email.sendOtp(user.email, code, purposeLabel);
  }

  private async consumeOtp(userId: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  private async findUserByEmail(email: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: {
        email: this.normalizeEmail(email),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  private async assertActiveVerifiedUser(user: User): Promise<void> {
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is disabled');
    }

    if (!user.emailVerifiedAt) {
      throw new BadRequestException('Email must be verified before login');
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private otpResponse(message: string): OtpChallengeResponse {
    return {
      success: true,
      message,
      expiresInSec: OTP_TTL_SEC,
    };
  }
}
