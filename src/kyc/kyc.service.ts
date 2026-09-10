import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KycSubmission, KycStatus, UserTier } from '@prisma/client';

import { UploadedFile } from '../common/uploads/uploaded-file';
import { UploadsService } from '../common/uploads/uploads.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { SubmitTierTwoKycDto } from './dto/submit-tier-two-kyc.dto';

const TIER_2_DAILY_DEPOSIT_LIMIT_XAF = '5000000';
const TIER_2_MONTHLY_DEPOSIT_LIMIT_XAF = '50000000';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  submit(userId: string, dto: SubmitKycDto): Promise<KycSubmission> {
    return this.prisma.kycSubmission.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
        frontImageUrl: dto.frontImageUrl,
        backImageUrl: dto.backImageUrl,
        selfieImageUrl: dto.selfieImageUrl,
      },
    });
  }

  async submitTierTwo(
    userId: string,
    dto: SubmitTierTwoKycDto,
    files: {
      proofOfAddress?: UploadedFile[];
      faceVerification?: UploadedFile[];
      idFront?: UploadedFile[];
      idBack?: UploadedFile[];
    },
  ): Promise<KycSubmission> {
    const directory = `kyc/${userId}`;
    const imageAndPdf = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const imageOnly = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ];
    const proofOfAddressUrl = await this.uploads.save(
      files.proofOfAddress?.[0],
      directory,
      imageAndPdf,
    );
    const faceVerificationImageUrl = await this.uploads.save(
      files.faceVerification?.[0],
      directory,
      imageOnly,
    );
    const idFrontUrl = await this.uploads.save(files.idFront?.[0], directory, imageAndPdf);
    const idBackUrl = await this.uploads.save(files.idBack?.[0], directory, imageAndPdf);

    return this.prisma.kycSubmission.create({
      data: {
        userId,
        documentType: dto.idCardType,
        frontImageUrl: idFrontUrl,
        backImageUrl: idBackUrl,
        selfieImageUrl: faceVerificationImageUrl,
        countryOfOrigin: dto.countryOfOrigin,
        countryOfResidence: dto.countryOfResidence,
        proofOfAddressUrl,
        faceVerificationImageUrl,
        idCardType: dto.idCardType,
        idFrontUrl,
        idBackUrl,
      },
    });
  }

  listForUser(userId: string): Promise<KycSubmission[]> {
    return this.prisma.kycSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getForUser(userId: string, id: string): Promise<KycSubmission> {
    const submission = await this.prisma.kycSubmission.findFirst({
      where: { id, userId },
    });

    if (!submission) {
      throw new NotFoundException('KYC submission not found');
    }

    return submission;
  }

  listForAdmin(status?: KycStatus): Promise<KycSubmission[]> {
    return this.prisma.kycSubmission.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async approve(id: string, adminUserId: string): Promise<KycSubmission> {
    const submission = await this.findForAdmin(id);
    if (submission.status === KycStatus.APPROVED) {
      return submission;
    }

    return this.prisma.$transaction(async (tx) => {
      const approved = await tx.kycSubmission.update({
        where: { id },
        data: {
          status: KycStatus.APPROVED,
          rejectionReason: null,
          reviewedById: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: submission.userId },
        data: {
          tier: UserTier.TIER_2,
          dailyDepositLimitXaf: TIER_2_DAILY_DEPOSIT_LIMIT_XAF,
          monthlyDepositLimitXaf: TIER_2_MONTHLY_DEPOSIT_LIMIT_XAF,
        },
      });

      return approved;
    });
  }

  async reject(id: string, adminUserId: string, reason?: string): Promise<KycSubmission> {
    const submission = await this.findForAdmin(id);
    if (submission.status === KycStatus.APPROVED) {
      throw new BadRequestException('Approved KYC submissions cannot be rejected');
    }

    return this.prisma.kycSubmission.update({
      where: { id },
      data: {
        status: KycStatus.REJECTED,
        rejectionReason: reason,
        reviewedById: adminUserId,
        reviewedAt: new Date(),
      },
    });
  }

  private async findForAdmin(id: string): Promise<KycSubmission> {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('KYC submission not found');
    }

    if (submission.status === KycStatus.REJECTED) {
      throw new BadRequestException('Rejected KYC submissions cannot be reviewed again');
    }

    return submission;
  }
}
