import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { Role, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async googleAuth(googleAuthDto: GoogleAuthDto) {
    const { email, name, avatarUrl, role } = googleAuthDto;
    const formattedEmail = email.toLowerCase().trim();

    let user = await this.prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (!user) {
      const displayName = name || formattedEmail.split('@')[0];
      const rawUsername = (formattedEmail.split('@')[0]).toLowerCase().replace(/[^a-z0-9_]/g, '');
      
      let uniqueUsername = rawUsername;
      let counter = 1;
      while (await this.prisma.user.findFirst({ where: { username: uniqueUsername } })) {
        uniqueUsername = `${rawUsername}_${counter}`;
        counter++;
      }

      const dummyPassword = await bcrypt.hash(`google_oauth_${Date.now()}_${Math.random()}`, 10);
      const userRole = Role.BUYER; // Google auth is strictly for Buyers

      user = await this.prisma.user.create({
        data: {
          email: formattedEmail,
          password: dummyPassword,
          name: displayName,
          username: uniqueUsername,
          sellerName: null,
          niche: null,
          avatarUrl: avatarUrl || null,
          role: userRole,
          isApproved: true,
        },
      });
    } else {
      if (avatarUrl && !user.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl },
        });
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        sellerName: user.role === Role.SELLER ? (user.sellerName || user.name) : undefined,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isApproved: user.isApproved,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, username, sellerName, niche, discord, avatarUrl, accountType, role } = registerDto;
    const formattedEmail = email.toLowerCase().trim();
    const formattedUsername = username ? username.toLowerCase().trim().replace(/[^a-z0-9_]/g, '') : null;

    const existingUser = await this.prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('An account with this email address already exists. Please login instead.');
    }

    if (formattedUsername) {
      const existingUsername = await this.prisma.user.findFirst({
        where: { username: formattedUsername },
      });
      if (existingUsername) {
        throw new BadRequestException(`Username "@${formattedUsername}" is already taken. Please choose another.`);
      }
    }

    let finalAvatarUrl = avatarUrl || null;
    if (finalAvatarUrl && finalAvatarUrl.startsWith('data:image/')) {
      finalAvatarUrl = await this.cloudinaryService.uploadImage(finalAvatarUrl, 'elcheeno/sellers');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const requestedAccountType = (accountType || role || 'BUYER').toUpperCase();
    const isSeller = requestedAccountType === 'SELLER';
    const userRole = isSeller ? Role.SELLER : Role.BUYER;

    const user = await this.prisma.user.create({
      data: {
        email: formattedEmail,
        password: hashedPassword,
        name,
        username: formattedUsername || (email.split('@')[0]),
        sellerName: isSeller ? (sellerName || name) : null,
        niche: isSeller ? (niche || 'Multi-Game') : null,
        discord: discord || null,
        avatarUrl: finalAvatarUrl,
        role: userRole,
        isApproved: !isSeller, // Buyers are automatically approved, sellers require verification
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        sellerName: user.sellerName,
        role: user.role,
        niche: user.niche,
        avatarUrl: user.avatarUrl,
        isApproved: user.isApproved,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        sellerName: user.role === Role.SELLER ? (user.sellerName || user.name) : undefined,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isApproved: user.isApproved,
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        sellerName: true,
        role: true,
        isApproved: true,
        niche: true,
        discord: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getAllSellers() {
    return this.prisma.user.findMany({
      where: { role: Role.SELLER },
      select: {
        id: true,
        email: true,
        name: true,
        sellerName: true,
        role: true,
        isApproved: true,
        niche: true,
        discord: true,
        avatarUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveSeller(id: string) {
    const seller = await this.prisma.user.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('Seller not found');

    return this.prisma.user.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        email: true,
        name: true,
        isApproved: true,
      },
    });
  }

  async rejectSeller(id: string) {
    const seller = await this.prisma.user.findUnique({ where: { id } });
    if (!seller) throw new NotFoundException('Seller not found');

    return this.prisma.user.update({
      where: { id },
      data: { isApproved: false },
      select: {
        id: true,
        email: true,
        name: true,
        isApproved: true,
      },
    });
  }

  async getAllBuyers() {
    const buyers = await this.prisma.user.findMany({
      where: { role: Role.BUYER },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        isApproved: true,
        avatarUrl: true,
        createdAt: true,
        buyerOrders: {
          select: {
            id: true,
            price: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return buyers.map((b) => {
      const totalOrders = b.buyerOrders.length;
      const totalSpent = b.buyerOrders
        .filter((o) => o.status === OrderStatus.COMPLETED)
        .reduce((sum, o) => sum + o.price, 0);

      const { buyerOrders, ...rest } = b;
      return {
        ...rest,
        totalOrders,
        totalSpent,
      };
    });
  }
}
