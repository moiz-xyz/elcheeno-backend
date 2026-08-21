import { Injectable, OnModuleInit, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@Injectable()
export class ListingsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    // Auto-seeding disabled to allow user to manage listings manually via UI
  }

  async uploadImageToCloudinary(imageInput: string): Promise<string> {
    const uploadedUrl = await this.cloudinaryService.uploadImage(imageInput, 'elcheeno/listings');
    return uploadedUrl || imageInput;
  }

  async findAll(query?: { category?: string; search?: string; sellerId?: string; gameTitle?: string }) {
    const whereClause: any = {};

    if (query?.sellerId) {
      whereClause.sellerId = query.sellerId;
    }

    if (query?.category && query.category !== 'all') {
      whereClause.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query?.gameTitle) {
      whereClause.gameTitle = { contains: query.gameTitle, mode: 'insensitive' };
    }

    if (query?.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { gameTitle: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.listing.findMany({
      where: whereClause,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            role: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            role: true,
            email: true,
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundException(`Listing with ID "${id}" not found`);
    }

    return listing;
  }

  async create(createDto: CreateListingDto, authUserId?: string) {
    if (!createDto.imageUrl || createDto.imageUrl.trim() === '') {
      throw new BadRequestException('Product cover photo / image is required to publish a listing.');
    }

    let targetSellerId = authUserId || createDto.sellerId;

    if (!targetSellerId) {
      let defaultUser = await this.prisma.user.findFirst({
        where: { email: 'moiz@elcheeno.com' },
      });

      if (!defaultUser) {
        defaultUser = await this.prisma.user.create({
          data: {
            email: 'moiz@elcheeno.com',
            password: 'hashed_password_placeholder',
            name: 'Abdul Moiz',
            sellerName: 'Abdul Moiz',
            role: 'SELLER',
            isApproved: true,
          },
        });
      }
      targetSellerId = defaultUser.id;
    }

    const sellerUser = await this.prisma.user.findUnique({
      where: { id: targetSellerId },
    });

    if (sellerUser && sellerUser.role === 'SELLER' && !sellerUser.isApproved) {
      throw new ForbiddenException('Your seller account is currently pending identity verification. You cannot publish listings until your profile is approved by an admin.');
    }

    let finalImageUrl = createDto.imageUrl;
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      finalImageUrl = await this.uploadImageToCloudinary(finalImageUrl);
    }

    return this.prisma.listing.create({
      data: {
        title: createDto.title,
        category: createDto.category.toLowerCase(),
        gameTitle: createDto.gameTitle || createDto.title,
        price: Number(createDto.price),
        deliveryType: createDto.deliveryType || 'instant',
        description: createDto.description || '',
        credentials: createDto.credentials || '',
        imageUrl: finalImageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        sellerId: targetSellerId,
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdateListingDto) {
    const listing = await this.findOne(id);
    const sellerUser = await this.prisma.user.findUnique({ where: { id: listing.sellerId } });
    if (sellerUser && sellerUser.role === 'SELLER' && !sellerUser.isApproved) {
      throw new ForbiddenException('Your seller account is currently pending identity verification. You cannot update listings until approved by an admin.');
    }

    return this.prisma.listing.update({
      where: { id },
      data: updateDto,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const listing = await this.findOne(id);
    const sellerUser = await this.prisma.user.findUnique({ where: { id: listing.sellerId } });
    if (sellerUser && sellerUser.role === 'SELLER' && !sellerUser.isApproved) {
      throw new ForbiddenException('Your seller account is currently pending identity verification. You cannot delete listings until approved by an admin.');
    }

    return this.prisma.listing.delete({
      where: { id },
    });
  }

  // Seed realistic listings if database is empty
  async seedInitialListings() {
    const count = await this.prisma.listing.count();
    if (count > 0) return;

    // Create sellers
    let mainSeller = await this.prisma.user.findFirst({
      where: { email: 'moiz@elcheeno.com' },
    });

    if (!mainSeller) {
      mainSeller = await this.prisma.user.create({
        data: {
          email: 'moiz@elcheeno.com',
          password: 'hashed_password',
          name: 'Abdul Moiz',
          sellerName: 'Abdul Moiz (Verified Vendor)',
          role: 'SELLER',
        },
      });
    }

    let secondarySeller = await this.prisma.user.findFirst({
      where: { email: 'proseller@elcheeno.com' },
    });

    if (!secondarySeller) {
      secondarySeller = await this.prisma.user.create({
        data: {
          email: 'proseller@elcheeno.com',
          password: 'hashed_password',
          name: 'ApexVault Sellers',
          sellerName: 'ApexVault Official',
          role: 'SELLER',
        },
      });
    }

    const seedListings = [
      {
        title: 'Valorant Radiant Account • 140+ Premium Vandal & Phantom Skins',
        category: 'games',
        gameTitle: 'Valorant',
        price: 185.00,
        deliveryType: 'instant',
        description: 'Includes Kuronami Vandal, Prime Vandal, Reaver 2.0 Karambit, Radiant Buddy Season 2026. Full email access included.',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        sellerId: mainSeller.id,
      },
      {
        title: 'Fortnite OG Renegade Raider + Travis Scott + 250 Skins',
        category: 'games',
        gameTitle: 'Fortnite',
        price: 320.00,
        deliveryType: 'instant',
        description: 'Original Season 1 account with Renegade Raider, Black Knight, Travis Scott, Leviathan Axe. PDF receipt & full recovery info included.',
        imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop',
        sellerId: secondarySeller.id,
      },
      {
        title: 'Netflix Premium Ultra HD 4K • 12 Months Private Subscription',
        category: 'streaming',
        gameTitle: 'Netflix',
        price: 39.99,
        deliveryType: 'instant',
        description: 'Private 4K UHD 4-screen profile. Full 12-month warranty with 24/7 instant replacement guaranty.',
        imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop',
        sellerId: mainSeller.id,
      },
      {
        title: 'Spotify Premium Individual • 1 Year Prepaid Gift License',
        category: 'streaming',
        gameTitle: 'Spotify',
        price: 24.99,
        deliveryType: 'instant',
        description: 'Ad-free high audio quality streaming. Redeem directly on your existing account.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
        sellerId: secondarySeller.id,
      },
      {
        title: 'Windows 11 Pro Lifetime Retail Digital License Key',
        category: 'software',
        gameTitle: 'Windows 11 Pro',
        price: 14.99,
        deliveryType: 'instant',
        description: '100% Genuine Microsoft Retail Product Key. Instant automated email key dispatch.',
        imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
        sellerId: mainSeller.id,
      },
      {
        title: 'Adobe Creative Cloud All Apps • 1-Year Master License Key',
        category: 'software',
        gameTitle: 'Adobe CC',
        price: 89.00,
        deliveryType: 'instant',
        description: 'Full access to Photoshop, Premiere, Illustrator, After Effects with 100GB Cloud Storage.',
        imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
        sellerId: secondarySeller.id,
      },
      {
        title: 'World of Warcraft Gold • 1,000,000 Gold (US Realm)',
        category: 'currency',
        gameTitle: 'World of Warcraft',
        price: 45.00,
        deliveryType: 'manual',
        description: 'Safe Guild Bank or Face-to-Face delivery. Delivery guaranteed within 15 minutes of payment.',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        sellerId: mainSeller.id,
      },
      {
        title: 'Rank Boosting • Silver to Diamond Fast Rank Push',
        category: 'boosting',
        gameTitle: 'Valorant / Apex',
        price: 55.00,
        deliveryType: 'manual',
        description: 'Top Radiant/Predator boosters. Duo queue or solo play with VPN protection and live Discord stream.',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop',
        sellerId: mainSeller.id,
      },
    ];

    for (const item of seedListings) {
      await this.prisma.listing.create({ data: item });
    }

    console.log('Successfully seeded real marketplace listings with seller relations!');
  }
}
