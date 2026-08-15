import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Upload an image attachment for messages to Cloudinary.
   */
  async uploadImage(imageInput: string) {
    if (!imageInput) {
      throw new BadRequestException('Image data or URL is required');
    }
    const imageUrl = await this.cloudinaryService.uploadImage(imageInput, 'elcheeno/messages');
    return { imageUrl };
  }

  /**
   * Get all conversations for the authenticated user.
   * Strictly filtered to conversations where the user is either userOne or userTwo.
   */
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [
          { userOneId: userId },
          { userTwoId: userId },
        ],
      },
      include: {
        userOne: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            sellerName: true,
          },
        },
        userTwo: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            sellerName: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Format conversations to clearly provide otherUser info & unread count
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const rawOtherUser = conv.userOneId === userId ? conv.userTwo : conv.userOne;
        const otherUser = rawOtherUser || {
          id: 'deleted',
          name: 'Unknown User',
          username: 'unknown',
          email: '',
          role: 'BUYER',
          sellerName: 'Unknown User',
        };

        const lastMessage = conv.messages[0] || null;

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            receiverId: userId,
            read: false,
          },
        });

        return {
          id: conv.id,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          otherUser,
          lastMessage,
          unreadCount,
        };
      }),
    );

    return formatted;
  }

  /**
   * Find existing conversation or create a new one between two users.
   */
  async startOrCreateConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new BadRequestException('Cannot start a chat session with yourself');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient user not found');
    }

    // Check if conversation already exists between the two users
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { userOneId: userId, userTwoId: recipientId },
          { userOneId: recipientId, userTwoId: userId },
        ],
      },
      include: {
        userOne: {
          select: { id: true, name: true, username: true, email: true, role: true, sellerName: true },
        },
        userTwo: {
          select: { id: true, name: true, username: true, email: true, role: true, sellerName: true },
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userOneId: userId,
          userTwoId: recipientId,
        },
        include: {
          userOne: {
            select: { id: true, name: true, username: true, email: true, role: true, sellerName: true },
          },
          userTwo: {
            select: { id: true, name: true, username: true, email: true, role: true, sellerName: true },
          },
        },
      });
    }

    const otherUser = conversation.userOneId === userId ? conversation.userTwo : conversation.userOne;

    return {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      otherUser,
    };
  }

  /**
   * Get all messages in a conversation.
   * Strictly enforces privacy: User MUST be a member of this conversation.
   */
  async getConversationMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation thread not found');
    }

    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Access denied to private conversation thread');
    }

    // Mark incoming unread messages as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return messages;
  }

  /**
   * Send a message inside a private conversation.
   */
  async sendMessage(userId: string, conversationId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation thread not found');
    }

    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Access denied to send message in this conversation');
    }

    const receiverId = conversation.userOneId === userId ? conversation.userTwoId : conversation.userOneId;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        receiverId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Touch conversation updatedAt timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Search potential users to start a chat with (sellers, buyers, etc.)
   */
  async searchUsers(userId: string, query?: string) {
    const whereClause: any = {
      id: { not: userId },
    };

    if (query && query.trim()) {
      const q = query.trim();
      whereClause.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { sellerName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        sellerName: true,
        niche: true,
      },
      take: 20,
    });

    return users;
  }

  /**
   * Get total unread count for user across all conversations.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });

    return { unreadCount: count };
  }
}
