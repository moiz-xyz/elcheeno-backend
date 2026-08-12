import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  async createLead(createLeadDto: CreateLeadDto) {
    let blogId = createLeadDto.blogId;

    if (!blogId && createLeadDto.blogSlug) {
      const blog = await this.prisma.blogPost.findUnique({
        where: { slug: createLeadDto.blogSlug },
      });
      if (blog) {
        blogId = blog.id;
      }
    }

    return this.prisma.blogLead.create({
      data: {
        name: createLeadDto.name,
        email: createLeadDto.email,
        subject: createLeadDto.subject || 'Blog Inquiry',
        message: createLeadDto.message,
        status: LeadStatus.NEW,
        blogId: blogId || undefined,
      },
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAllLeads(status?: LeadStatus) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.blogLead.findMany({
      where,
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLead(id: string, updateLeadStatusDto: UpdateLeadStatusDto) {
    const lead = await this.prisma.blogLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with id "${id}" not found`);
    }

    return this.prisma.blogLead.update({
      where: { id },
      data: updateLeadStatusDto,
      include: {
        blog: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  async deleteLead(id: string) {
    const lead = await this.prisma.blogLead.findUnique({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with id "${id}" not found`);
    }

    return this.prisma.blogLead.delete({ where: { id } });
  }
}
