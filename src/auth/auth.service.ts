import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, sellerName, niche, discord } = registerDto;
    const formattedEmail = email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: formattedEmail },
    });

    if (existingUser) {
      throw new BadRequestException('An account with this email address already exists. Please login instead.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: formattedEmail,
        password: hashedPassword,
        name,
        sellerName: sellerName || name,
        niche: niche || 'Multi-Game',
        discord: discord || null,
        role: Role.SELLER,
        isApproved: false,
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
        sellerName: user.sellerName,
        role: user.role,
        niche: user.niche,
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
        sellerName: user.sellerName || user.name,
        role: user.role,
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
        sellerName: true,
        role: true,
        isApproved: true,
        niche: true,
        discord: true,
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
}
