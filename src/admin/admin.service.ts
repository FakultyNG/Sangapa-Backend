import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AdminEnvironmentVariable, KycSubmission, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { UploadedFile } from '../common/uploads/uploaded-file';
import { UploadsService } from '../common/uploads/uploads.service';
import { KycService } from '../kyc/kyc.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser, UsersService } from '../users/users.service';
import { TotalWalletSummary } from '../wallet/wallet.types';
import { WalletService } from '../wallet/wallet.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListAdminUsersQueryDto } from './dto/list-admin-users-query.dto';
import { ListKycQueryDto } from './dto/list-kyc-query.dto';
import { UpdateAdminEnvDto } from './dto/update-admin-env.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import { UpdateUserLimitsDto } from './dto/update-user-limits.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly kyc: KycService,
    private readonly uploads: UploadsService,
    private readonly wallet: WalletService,
  ) {}

  async listUsers(query: ListAdminUsersQueryDto): Promise<PublicUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        email: query.email ? query.email.trim().toLowerCase() : undefined,
        role: query.role === 'ADMIN' || query.role === 'USER' ? query.role : undefined,
        tier: query.tier === 'TIER_1' || query.tier === 'TIER_2' ? query.tier : undefined,
        deletionStatus: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return users.map((user) => this.users.toPublicUser(user));
  }

  async createUser(dto: CreateUserDto): Promise<PublicUser> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        pinHash: await bcrypt.hash(dto.pin, 12),
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        role: dto.role ?? 'USER',
        tier: dto.tier ?? 'TIER_1',
        emailVerifiedAt: new Date(),
      },
    });

    return this.users.toPublicUser(user);
  }

  async getUser(id: string): Promise<PublicUser> {
    const user = await this.findUser(id);
    return this.users.toPublicUser(user);
  }

  async updateUserLimits(id: string, dto: UpdateUserLimitsDto): Promise<PublicUser> {
    await this.findUser(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        tier: dto.tier,
        dailyDepositLimitXaf: dto.dailyDepositLimitXaf,
        monthlyDepositLimitXaf: dto.monthlyDepositLimitXaf,
      },
    });

    return this.users.toPublicUser(user);
  }

  async updateUser(id: string, dto: UpdateUserAdminDto): Promise<PublicUser> {
    await this.findUser(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email?.trim().toLowerCase(),
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
        role: dto.role,
        status: dto.status,
        tier: dto.tier,
      },
    });

    return this.users.toPublicUser(user);
  }

  async uploadProfileImage(id: string, file: UploadedFile | undefined): Promise<PublicUser> {
    await this.findUser(id);
    const profileImageUrl = await this.uploads.save(file, `profiles/${id}`, [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
    ]);
    const user = await this.prisma.user.update({
      where: { id },
      data: { profileImageUrl },
    });

    return this.users.toPublicUser(user);
  }

  async suspendUser(id: string): Promise<PublicUser> {
    await this.findUser(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DISABLED,
        sessions: {
          updateMany: {
            where: { revokedAt: null },
            data: { revokedAt: new Date() },
          },
        },
      },
    });

    return this.users.toPublicUser(user);
  }

  async activateUser(id: string): Promise<PublicUser> {
    await this.findUser(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    return this.users.toPublicUser(user);
  }

  async deleteUser(id: string, adminUserId: string): Promise<{ success: true }> {
    if (id === adminUserId) {
      throw new BadRequestException('Admins cannot delete their own account');
    }

    await this.findUser(id);
    await this.prisma.user.delete({ where: { id } });

    return { success: true };
  }

  async getUserWallets(id: string, requestId?: string): Promise<TotalWalletSummary> {
    await this.findUser(id);
    return this.wallet.getSummary(id, requestId);
  }

  async listEnvironmentVariables(): Promise<AdminEnvironmentVariable[]> {
    const variables = await this.prisma.adminEnvironmentVariable.findMany({
      orderBy: { key: 'asc' },
    });

    return variables.map((variable) => this.redactEnvironmentVariable(variable));
  }

  async updateEnvironmentVariable(
    adminUserId: string,
    dto: UpdateAdminEnvDto,
  ): Promise<AdminEnvironmentVariable> {
    const variable = await this.prisma.adminEnvironmentVariable.upsert({
      where: { key: dto.key },
      create: {
        key: dto.key,
        value: dto.value,
        sensitive: dto.sensitive ?? true,
        updatedBy: adminUserId,
      },
      update: {
        value: dto.value,
        sensitive: dto.sensitive ?? true,
        updatedBy: adminUserId,
      },
    });

    return this.redactEnvironmentVariable(variable);
  }

  listKycSubmissions(query: ListKycQueryDto): Promise<KycSubmission[]> {
    return this.kyc.listForAdmin(query.status);
  }

  approveKyc(id: string, adminUserId: string): Promise<KycSubmission> {
    return this.kyc.approve(id, adminUserId);
  }

  rejectKyc(id: string, adminUserId: string, reason?: string): Promise<KycSubmission> {
    return this.kyc.reject(id, adminUserId, reason);
  }

  listDashboardEndpoints(): { method: string; path: string; purpose: string }[] {
    return [
      {
        method: 'GET',
        path: '/admin/users',
        purpose: 'List dashboard users with email, role, or tier filters',
      },
      { method: 'POST', path: '/admin/users', purpose: 'Create USER or ADMIN accounts' },
      { method: 'GET', path: '/admin/users/:id', purpose: 'View a user profile, tier, and limits' },
      {
        method: 'PATCH',
        path: '/admin/users/:id',
        purpose: 'Update user profile, role, status, or tier',
      },
      {
        method: 'POST',
        path: '/admin/users/:id/profile-image',
        purpose: 'Upload or replace a user profile image',
      },
      {
        method: 'PATCH',
        path: '/admin/users/:id/limits',
        purpose: 'Edit user tier and XAF deposit limits',
      },
      {
        method: 'PATCH',
        path: '/admin/users/:id/suspend',
        purpose: 'Suspend a user and revoke sessions',
      },
      {
        method: 'PATCH',
        path: '/admin/users/:id/activate',
        purpose: 'Reactivate a suspended user',
      },
      { method: 'DELETE', path: '/admin/users/:id', purpose: 'Delete a user account' },
      {
        method: 'GET',
        path: '/admin/users/:id/wallets',
        purpose: 'View read-only XAF, EUR, and USDC wallets',
      },
      { method: 'GET', path: '/admin/kyc/submissions', purpose: 'List KYC submissions by status' },
      {
        method: 'POST',
        path: '/admin/kyc/submissions/:id/approve',
        purpose: 'Approve KYC and promote user to Tier 2 limits',
      },
      {
        method: 'POST',
        path: '/admin/kyc/submissions/:id/reject',
        purpose: 'Reject KYC with an optional reason',
      },
      {
        method: 'GET',
        path: '/admin/env',
        purpose: 'List dashboard-managed environment overrides',
      },
      { method: 'PATCH', path: '/admin/env', purpose: 'Create or update an environment override' },
      {
        method: 'GET',
        path: '/admin/dashboard/endpoints',
        purpose: 'List backend endpoints useful for the admin dashboard',
      },
      { method: 'GET', path: '/health', purpose: 'Backend liveness check' },
      { method: 'GET', path: '/ready', purpose: 'Backend readiness check' },
      {
        method: 'POST',
        path: '/webhooks/reepay',
        purpose: 'Inbound Reepay status updates for operational visibility',
      },
    ];
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletionStatus: 'ACTIVE',
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private redactEnvironmentVariable(variable: AdminEnvironmentVariable): AdminEnvironmentVariable {
    if (!variable.sensitive) {
      return variable;
    }

    return {
      ...variable,
      value: '********',
    };
  }
}
