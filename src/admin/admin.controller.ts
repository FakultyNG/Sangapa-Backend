import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { KycSubmission } from '@prisma/client';

import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-request';
import { RequestWithId } from '../common/types/request-with-id';
import { UploadedFile as SangaUploadedFile } from '../common/uploads/uploaded-file';
import { PublicUser } from '../users/users.service';
import { TotalWalletSummary } from '../wallet/wallet.types';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { ListKycQueryDto } from './dto/list-kyc-query.dto';
import { RejectKycDto } from './dto/reject-kyc.dto';
import { UpdateAdminEnvDto } from './dto/update-admin-env.dto';
import { UpdateSessionPolicyDto } from './dto/update-session-policy.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateUserLimitsDto } from './dto/update-user-limits.dto';
import { SessionPolicy } from '../auth/session-policy.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers(@Query() query: ListAdminUsersQueryDto): Promise<PublicUser[]> {
    return this.admin.listUsers(query);
  }

  @Post('users')
  createUser(@Body() dto: CreateUserDto): Promise<PublicUser> {
    return this.admin.createUser(dto);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string): Promise<PublicUser> {
    return this.admin.getUser(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserAdminDto): Promise<PublicUser> {
    return this.admin.updateUser(id, dto);
  }

  @Patch('users/:id/limits')
  updateUserLimits(@Param('id') id: string, @Body() dto: UpdateUserLimitsDto): Promise<PublicUser> {
    return this.admin.updateUserLimits(id, dto);
  }

  @Post('users/:id/profile-image')
  @UseInterceptors(FileInterceptor('profileImage'))
  uploadProfileImage(
    @Param('id') id: string,
    @UploadedFile() file: SangaUploadedFile,
  ): Promise<PublicUser> {
    return this.admin.uploadProfileImage(id, file);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string): Promise<PublicUser> {
    return this.admin.suspendUser(id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string): Promise<PublicUser> {
    return this.admin.activateUser(id);
  }

  @Delete('users/:id')
  deleteUser(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: true }> {
    return this.admin.deleteUser(id, adminUser.id);
  }

  @Get('users/:id/wallets')
  getUserWallets(
    @Req() request: RequestWithId,
    @Param('id') id: string,
  ): Promise<TotalWalletSummary> {
    return this.admin.getUserWallets(id, request.id);
  }

  @Get('kyc/submissions')
  listKycSubmissions(@Query() query: ListKycQueryDto): Promise<KycSubmission[]> {
    return this.admin.listKycSubmissions(query);
  }

  @Post('kyc/submissions/:id/approve')
  approveKyc(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<KycSubmission> {
    return this.admin.approveKyc(id, adminUser.id);
  }

  @Post('kyc/submissions/:id/reject')
  rejectKyc(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RejectKycDto,
  ): Promise<KycSubmission> {
    return this.admin.rejectKyc(id, adminUser.id, dto.reason);
  }

  @Get('env')
  listEnvironmentVariables() {
    return this.admin.listEnvironmentVariables();
  }

  @Patch('env')
  updateEnvironmentVariable(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Body() dto: UpdateAdminEnvDto,
  ) {
    return this.admin.updateEnvironmentVariable(adminUser.id, dto);
  }

  @Get('session-settings')
  getSessionSettings(): Promise<SessionPolicy> {
    return this.admin.getSessionPolicy();
  }

  @Patch('session-settings')
  updateSessionSettings(
    @CurrentUser() adminUser: AuthenticatedUser,
    @Body() dto: UpdateSessionPolicyDto,
  ): Promise<SessionPolicy> {
    return this.admin.updateSessionPolicy(adminUser.id, dto);
  }

  @Get('dashboard/endpoints')
  listDashboardEndpoints(): { method: string; path: string; purpose: string }[] {
    return this.admin.listDashboardEndpoints();
  }
}
