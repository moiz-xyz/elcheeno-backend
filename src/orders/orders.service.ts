import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, Role } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async createOrder(buyerId: string, createOrderDto: CreateOrderDto) {
    const { listingId } = createOrderDto;

    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { seller: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found or no longer available.');
    }

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('You cannot purchase your own listing.');
    }

    // Generate unique order number
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        listingId: listing.id,
        buyerId,
        sellerId: listing.sellerId,
        price: listing.price,
        credentials: listing.credentials || 'Automated Instant Delivery: Access granted upon purchase. Contact seller via chat if credentials need refresh.',
        status: OrderStatus.PENDING,
      },
      include: {
        listing: true,
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            email: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return order;
  }

  async getMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
        ],
      },
      include: {
        listing: true,
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            email: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderIdOrNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrNumber },
          { orderNumber: orderIdOrNumber },
        ],
      },
      include: {
        listing: true,
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            email: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(userId: string, orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { sellerId: userId },
          { buyerId: userId },
        ],
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or access denied.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role === Role.SELLER && !user.isApproved) {
      throw new ForbiddenException('Your seller account is currently pending identity verification. You cannot update order status until approved by an admin.');
    }

    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestException('This order is already COMPLETED and cannot be modified.');
    }

    return this.prisma.order.update({
      where: { id: order.id },
      data: { status },
      include: {
        listing: true,
        seller: {
          select: {
            id: true,
            name: true,
            sellerName: true,
            email: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}
