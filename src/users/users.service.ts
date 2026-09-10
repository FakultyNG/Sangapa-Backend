import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type PublicUser = {
  id: string;
  customerId: string;
  email: string;
  fullName: string | null;
  phoneNumber: string | null;
  profileImageUrl: string | null;
  emailVerified: boolean;
  status: string;
  role: string;
  tier: string;
  dailyDepositLimitXaf: string;
  monthlyDepositLimitXaf: string;
  emailNotificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getCurrentUser(id: string): Promise<PublicUser> {
    const user = await this.findByIdOrThrow(id);
    return this.toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<PublicUser> {
    await this.findByIdOrThrow(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber,
      },
    });

    return this.toPublicUser(user);
  }

  toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      customerId: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      profileImageUrl: user.profileImageUrl,
      emailVerified: Boolean(user.emailVerifiedAt),
      status: user.status,
      role: user.role,
      tier: user.tier,
      dailyDepositLimitXaf: user.dailyDepositLimitXaf,
      monthlyDepositLimitXaf: user.monthlyDepositLimitXaf,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
