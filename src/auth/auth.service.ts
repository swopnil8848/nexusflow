import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UserLoginDto } from './dto/user-login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async loginUser(dto: UserLoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phoneNumber: dto.identifier }],
        role: UserRole.USER,
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid user credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid user credentials');
    }

    return {
      accessToken: this.buildAccessToken(user.id, user.role),
      user: {
        id: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async loginAdmin(dto: AdminLoginDto) {
    const admin = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return {
      accessToken: this.buildAccessToken(admin.id, admin.role),
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  private buildAccessToken(subject: string, role: UserRole) {
    return Buffer.from(`${subject}:${role}:${Date.now()}`).toString('base64url');
  }
}
