import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { KycSubmission } from '@prisma/client';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-request';
import { UploadedFile } from '../common/uploads/uploaded-file';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { SubmitTierTwoKycDto } from './dto/submit-tier-two-kyc.dto';
import { KycService } from './kyc.service';

type TierTwoKycFiles = {
  proofOfAddress?: UploadedFile[];
  faceVerification?: UploadedFile[];
  idFront?: UploadedFile[];
  idBack?: UploadedFile[];
};

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Post('submissions')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ): Promise<KycSubmission> {
    return this.kyc.submit(user.id, dto);
  }

  @Post('tier-2')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'proofOfAddress', maxCount: 1 },
      { name: 'faceVerification', maxCount: 1 },
      { name: 'idFront', maxCount: 1 },
      { name: 'idBack', maxCount: 1 },
    ]),
  )
  submitTierTwo(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitTierTwoKycDto,
    @UploadedFiles() files: TierTwoKycFiles,
  ): Promise<KycSubmission> {
    return this.kyc.submitTierTwo(user.id, dto, files);
  }

  @Get('submissions')
  list(@CurrentUser() user: AuthenticatedUser): Promise<KycSubmission[]> {
    return this.kyc.listForUser(user.id);
  }

  @Get('submissions/:id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<KycSubmission> {
    return this.kyc.getForUser(user.id, id);
  }
}
