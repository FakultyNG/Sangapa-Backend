import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';

import { AuthenticatedRequest } from '../common/types/authenticated-request';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = jwt.verify(token, this.getAccessSecret()) as JwtPayload;
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
        throw new UnauthorizedException('Session is no longer active');
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }

  private getAccessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new UnauthorizedException('JWT access secret is not configured');
    }

    return secret;
  }
}
