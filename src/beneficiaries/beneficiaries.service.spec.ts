import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BeneficiaryStatus, BeneficiaryType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ReepayClientService } from '../reepay-client';
import { BeneficiariesService } from './beneficiaries.service';

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;
  let moduleRef: TestingModule;
  let prisma: {
    beneficiary: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let reepay: {
    post: jest.Mock<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>;
  };

  beforeEach(async () => {
    prisma = {
      beneficiary: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    reepay = {
      post: jest.fn<Promise<Record<string, unknown>>, [string, Record<string, unknown>]>(),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        BeneficiariesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReepayClientService, useValue: reepay },
      ],
    }).compile();

    service = moduleRef.get(BeneficiariesService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('lists beneficiaries only for the authenticated user', async () => {
    prisma.beneficiary.findMany.mockResolvedValueOnce([]);

    await expect(service.list('user-id')).resolves.toEqual([]);
    expect(prisma.beneficiary.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-id' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('creates EUR IBAN beneficiary and optionally validates through Reepay', async () => {
    prisma.beneficiary.create.mockResolvedValueOnce({ id: 'beneficiary-id' });
    reepay.post.mockResolvedValueOnce({ valid: true });

    await service.create(
      'user-id',
      {
        type: BeneficiaryType.EUR_IBAN,
        beneficiaryName: 'Ada User',
        iban: 'DE89370400440532013000',
        bankName: 'Test Bank',
        validateWithReepay: true,
      },
      'request-id',
    );

    expect(reepay.post).toHaveBeenCalledWith('/v1/payouts/eur/recipient/validate', {
      requestId: 'request-id',
      body: {
        iban: 'DE89370400440532013000',
        beneficiaryName: 'Ada User',
      },
    });
    const createCall = prisma.beneficiary.create.mock.calls[0]?.[0] as {
      data: Record<string, unknown>;
    };
    expect(createCall.data.userId).toBe('user-id');
    expect(createCall.data.type).toBe(BeneficiaryType.EUR_IBAN);
    expect(createCall.data.beneficiaryName).toBe('Ada User');
    expect(createCall.data.iban).toBe('DE89370400440532013000');
    expect(createCall.data.status).toBe(BeneficiaryStatus.ACTIVE);
  });

  it('rejects beneficiary records missing fields required by type', async () => {
    await expect(
      service.create('user-id', {
        type: BeneficiaryType.USDC_ADDRESS,
        beneficiaryName: 'Ada User',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates only an owned beneficiary', async () => {
    prisma.beneficiary.findFirst.mockResolvedValueOnce({ id: 'beneficiary-id', userId: 'user-id' });
    prisma.beneficiary.update.mockResolvedValueOnce({ id: 'beneficiary-id', bankName: 'New Bank' });

    await service.update('user-id', 'beneficiary-id', { bankName: 'New Bank' });

    expect(prisma.beneficiary.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'beneficiary-id',
        userId: 'user-id',
      },
    });
    const updateCall = prisma.beneficiary.update.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(updateCall.where).toEqual({ id: 'beneficiary-id' });
    expect(updateCall.data.bankName).toBe('New Bank');
  });

  it('does not delete another user beneficiary', async () => {
    prisma.beneficiary.findFirst.mockResolvedValueOnce(null);

    await expect(service.delete('user-id', 'other-beneficiary-id')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.beneficiary.delete).not.toHaveBeenCalled();
  });
});
