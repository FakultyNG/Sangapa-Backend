import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_ADMIN_EMAIL = 'admin@sangapay.local';
const DEFAULT_ADMIN_PASSWORD = 'Admin12345!';
const DEFAULT_ADMIN_PIN = '0000';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    if (existingAdmin) {
      return;
    }

    const email = this.config.get<string>('DEFAULT_ADMIN_EMAIL') ?? DEFAULT_ADMIN_EMAIL;
    const password = this.config.get<string>('DEFAULT_ADMIN_PASSWORD') ?? DEFAULT_ADMIN_PASSWORD;
    const pin = this.config.get<string>('DEFAULT_ADMIN_PIN') ?? DEFAULT_ADMIN_PIN;

    await this.prisma.user.upsert({
      where: { email: email.trim().toLowerCase() },
      create: {
        email: email.trim().toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: await bcrypt.hash(pin, 12),
        fullName: 'SangaPay Admin',
        emailVerifiedAt: new Date(),
        role: UserRole.ADMIN,
      },
      update: {
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
      },
    });

    this.logger.warn(
      `Default admin account is available at ${email}. Override DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, and DEFAULT_ADMIN_PIN before production.`,
    );
  }
}
