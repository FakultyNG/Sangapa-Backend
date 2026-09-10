import { Test, TestingModule } from '@nestjs/testing';

import { UploadsService } from '../common/uploads/uploads.service';
import { KycService } from '../kyc/kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let moduleRef: TestingModule;
  let prisma: {
    adminEnvironmentVariable: {
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      adminEnvironmentVariable: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: { toPublicUser: jest.fn() } },
        { provide: KycService, useValue: {} },
        { provide: UploadsService, useValue: {} },
        { provide: WalletService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AdminService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('redacts sensitive environment override values', async () => {
    prisma.adminEnvironmentVariable.findMany.mockResolvedValueOnce([
      {
        key: 'SANGAPAY_REEPAY_API_KEY',
        value: 'secret-value',
        sensitive: true,
        updatedBy: 'admin-id',
        createdAt: new Date('2026-09-10T00:00:00.000Z'),
        updatedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    ]);

    await expect(service.listEnvironmentVariables()).resolves.toEqual([
      {
        key: 'SANGAPAY_REEPAY_API_KEY',
        value: '********',
        sensitive: true,
        updatedBy: 'admin-id',
        createdAt: new Date('2026-09-10T00:00:00.000Z'),
        updatedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    ]);
  });
});
