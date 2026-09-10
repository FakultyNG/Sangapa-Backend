import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Beneficiary, BeneficiaryStatus, BeneficiaryType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ReepayClientService } from '../reepay-client';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reepay: ReepayClientService,
  ) {}

  list(userId: string): Promise<Beneficiary[]> {
    return this.prisma.beneficiary.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(
    userId: string,
    dto: CreateBeneficiaryDto,
    requestId?: string,
  ): Promise<Beneficiary> {
    this.validateTypeFields(dto);

    if (dto.type === BeneficiaryType.EUR_IBAN && dto.validateWithReepay) {
      await this.reepay.post('/v1/payouts/eur/recipient/validate', {
        requestId,
        body: {
          iban: dto.iban,
          beneficiaryName: dto.beneficiaryName,
        },
      });
    }

    return this.prisma.beneficiary.create({
      data: {
        userId,
        type: dto.type,
        beneficiaryName: dto.beneficiaryName,
        iban: dto.iban,
        bankName: dto.bankName,
        beneficiaryAddress: dto.beneficiaryAddress,
        wiseTag: dto.wiseTag,
        usdcAddress: dto.usdcAddress,
        usdcNetwork: dto.usdcNetwork,
        status: BeneficiaryStatus.ACTIVE,
      },
    });
  }

  async get(userId: string, beneficiaryId: string): Promise<Beneficiary> {
    return this.findOwnedOrThrow(userId, beneficiaryId);
  }

  async update(
    userId: string,
    beneficiaryId: string,
    dto: UpdateBeneficiaryDto,
  ): Promise<Beneficiary> {
    await this.findOwnedOrThrow(userId, beneficiaryId);

    return this.prisma.beneficiary.update({
      where: {
        id: beneficiaryId,
      },
      data: {
        beneficiaryName: dto.beneficiaryName,
        iban: dto.iban,
        bankName: dto.bankName,
        beneficiaryAddress: dto.beneficiaryAddress,
        wiseTag: dto.wiseTag,
        usdcAddress: dto.usdcAddress,
        usdcNetwork: dto.usdcNetwork,
        status: dto.status,
      },
    });
  }

  async delete(userId: string, beneficiaryId: string): Promise<{ success: true }> {
    await this.findOwnedOrThrow(userId, beneficiaryId);
    await this.prisma.beneficiary.delete({
      where: {
        id: beneficiaryId,
      },
    });

    return { success: true };
  }

  private async findOwnedOrThrow(userId: string, beneficiaryId: string): Promise<Beneficiary> {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: {
        id: beneficiaryId,
        userId,
      },
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    return beneficiary;
  }

  private validateTypeFields(dto: CreateBeneficiaryDto): void {
    if (dto.type === BeneficiaryType.EUR_IBAN && (!dto.iban || !dto.beneficiaryName)) {
      throw new BadRequestException('EUR IBAN beneficiaries require iban and beneficiaryName');
    }

    if (dto.type === BeneficiaryType.EUR_WISETAG && !dto.wiseTag) {
      throw new BadRequestException('EUR WiseTag beneficiaries require wiseTag');
    }

    if (dto.type === BeneficiaryType.USDC_ADDRESS && (!dto.usdcAddress || !dto.usdcNetwork)) {
      throw new BadRequestException(
        'USDC address beneficiaries require usdcAddress and usdcNetwork',
      );
    }
  }
}
