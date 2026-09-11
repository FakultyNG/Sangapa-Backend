import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(): void {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    if (!process.env[key]) {
      process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
    }
  }
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
}

async function main(): Promise<void> {
  loadDotEnv();

  const email = (process.env.ADMIN_EMAIL ?? process.env.DEFAULT_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? process.env.DEFAULT_ADMIN_PASSWORD;
  const pin = process.env.ADMIN_PIN ?? process.env.DEFAULT_ADMIN_PIN;
  const fullName = process.env.ADMIN_FULL_NAME ?? 'SangaPay Admin';

  if (!email) {
    throw new Error('ADMIN_EMAIL or DEFAULT_ADMIN_EMAIL is required');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD or DEFAULT_ADMIN_PASSWORD must be at least 8 characters');
  }

  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new Error('ADMIN_PIN or DEFAULT_ADMIN_PIN must be a 4 digit PIN');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: requireEnv('DATABASE_URL'),
    }),
  });

  try {
    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: await bcrypt.hash(pin, 12),
        fullName,
        emailVerifiedAt: new Date(),
        role: UserRole.ADMIN,
      },
      update: {
        passwordHash: await bcrypt.hash(password, 12),
        pinHash: await bcrypt.hash(pin, 12),
        fullName,
        emailVerifiedAt: new Date(),
        role: UserRole.ADMIN,
        status: 'ACTIVE',
        deletionStatus: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
      },
    });

    console.log(`Admin ready: ${admin.email} (${admin.id}) role=${admin.role} status=${admin.status}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
