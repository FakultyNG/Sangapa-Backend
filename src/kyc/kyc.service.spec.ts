import { Test, TestingModule } from '@nestjs/testing';
import { KycStatus, UserTier } from '@prisma/client';

import { UploadsService } from '../common/uploads/uploads.service';
import { PrismaService } from '../prisma/prisma.service';
import { KycService } from './kyc.service';

describe('KycService', () => {
  let service: KycService;
  let moduleRef: TestingModule;
  let prisma: {
    kycSubmission: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      kycSubmission: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadsService, useValue: { save: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(KycService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('approves KYC and promotes the user to tier 2 limits', async () => {
    prisma.kycSubmission.findUnique.mockResolvedValueOnce({
      id: 'kyc-id',
      userId: 'user-id',
      status: KycStatus.PENDING,
    });
    prisma.kycSubmission.update.mockResolvedValueOnce({
      id: 'kyc-id',
      status: KycStatus.APPROVED,
    });

    await service.approve('kyc-id', 'admin-id');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      data: {
        tier: UserTier.TIER_2,
        dailyDepositLimitXaf: '5000000',
        monthlyDepositLimitXaf: '50000000',
      },
    });
  });
});
