import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload';
import { SessionPolicyService } from './session-policy.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionPolicy: SessionPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

    if (!token) {
      throw this.unauthorized('AUTH_MISSING_TOKEN', 'Missing bearer token');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, this.getAccessSecret()) as JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw this.unauthorized('AUTH_TOKEN_EXPIRED', 'Access token expired');
      }

      if (error instanceof JsonWebTokenError) {
        throw this.unauthorized('AUTH_INVALID_TOKEN', 'Invalid bearer token');
      }

      throw this.unauthorized('AUTH_INVALID_TOKEN', 'Invalid or expired bearer token');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw this.unauthorized('AUTH_SESSION_INACTIVE', 'Session is no longer active');
    }

    const policy = await this.sessionPolicy.getPolicy();
    const inactiveForMs = Date.now() - session.lastUsedAt.getTime();
    if (inactiveForMs > policy.refreshTokenInactivityTtlSec * 1000) {
      throw this.unauthorized('AUTH_SESSION_INACTIVE', 'Session expired due to inactivity');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      role: payload.role,
    };
    return true;
  }

  private getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw this.unauthorized('AUTH_CONFIG_MISSING', 'JWT access secret is not configured');
    }

    return secret;
  }

  private unauthorized(code: string, message: string): UnauthorizedException {
    return new UnauthorizedException({
      error: {
        code,
        message,
      },
    });
  }
}
