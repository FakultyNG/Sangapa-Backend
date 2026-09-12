import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = this.config.get<string>('DEFAULT_ADMIN_EMAIL')?.trim().toLowerCase();
    const password = this.config.get<string>('DEFAULT_ADMIN_PASSWORD');
    const pin = this.config.get<string>('DEFAULT_ADMIN_PIN');

    if (!email || !password || !pin) {
      this.logger.warn(
        'Default admin bootstrap skipped. Set DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, and DEFAULT_ADMIN_PIN to create or rotate an admin at startup.',
      );
      return;
    }

    if (password.length < 8 || !/^\d{4}$/.test(pin)) {
      this.logger.error(
        'Default admin bootstrap skipped. DEFAULT_ADMIN_PASSWORD must be at least 8 characters and DEFAULT_ADMIN_PIN must be 4 digits.',
      );
      return;
    }

    const admin = await this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: await bcrypt.hash(pin, 12),
        fullName: 'SangaPay Admin',
        emailVerifiedAt: new Date(),
        role: UserRole.ADMIN,
      },
      update: {
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: await bcrypt.hash(pin, 12),
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        deletionStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
      },
    });

    this.logger.log(`Configured admin account is ready: ${admin.email} (${admin.id})`);
  }
}
