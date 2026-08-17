import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BlogsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async findAll(category?: string, search?: string) {
    const where: any = {};

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }

    return this.prisma.blogPost.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug "${slug}" not found`);
    }

    return post;
  }

  async findOneById(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with id "${id}" not found`);
    }

    return post;
  }

  async uploadImageToCloudinary(imageInput: string): Promise<string> {
    if (!imageInput) return '';
    const uploadedUrl = await this.cloudinaryService.uploadImage(imageInput, 'elcheeno/blogs');
    if (uploadedUrl && uploadedUrl.startsWith('http')) {
      return uploadedUrl;
    }
    return this.processCoverImage(imageInput);
  }

  async processCoverImage(imageInput?: string): Promise<string> {
    const defaultUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop';
    if (!imageInput) return defaultUrl;

    if (!imageInput.startsWith('data:image/')) {
      return imageInput;
    }

    // Attempt Cloudinary upload first
    const uploadedUrl = await this.cloudinaryService.uploadImage(imageInput, 'elcheeno/blogs');
    if (uploadedUrl && uploadedUrl.startsWith('http')) {
      return uploadedUrl;
    }

    // Fallback to local disk if Cloudinary environment variables are not set or fail
    try {
      const match = imageInput.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!match) return defaultUrl;

      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      const fileName = `cover-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;

      const possibleDirs = [
        '/var/www/elcheeno.com/public/uploads/blogs',
        path.join(process.cwd(), '..', 'elchino', 'public', 'uploads', 'blogs'),
        path.join(process.cwd(), 'public', 'uploads', 'blogs'),
      ];

      for (const uploadDir of possibleDirs) {
        try {
          const parentDir = path.dirname(path.dirname(uploadDir));
          if (fs.existsSync(parentDir) || uploadDir.startsWith('/var/www/elcheeno.com')) {
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, buffer);
          }
        } catch (e) {
          console.error(`Failed writing image to ${uploadDir}:`, e);
        }
      }

      return `/uploads/blogs/${fileName}`;
    } catch (error) {
      console.error('Error saving uploaded cover image:', error);
      return defaultUrl;
    }
  }

  async create(createBlogDto: CreateBlogDto, authorId: string) {
    const slug = createBlogDto.slug
      ? this.generateSlug(createBlogDto.slug)
      : this.generateSlug(createBlogDto.title);

    const tags = Array.isArray(createBlogDto.tags)
      ? createBlogDto.tags
      : typeof createBlogDto.tags === 'string'
      ? (createBlogDto.tags as string).split(',').map((t) => t.trim())
      : ['General'];

    const coverImage = await this.processCoverImage(createBlogDto.coverImage);

    return this.prisma.blogPost.create({
      data: {
        title: createBlogDto.title,
        slug,
        category: createBlogDto.category,
        excerpt: createBlogDto.excerpt,
        content: createBlogDto.content,
        coverImage,
        tags,
        metaTitle: createBlogDto.metaTitle || createBlogDto.title,
        metaDescription: createBlogDto.metaDescription || createBlogDto.excerpt,
        isPublished: createBlogDto.isPublished !== undefined ? createBlogDto.isPublished : true,
        featured: createBlogDto.featured !== undefined ? createBlogDto.featured : false,
        readTime: createBlogDto.readTime || '5 min read',
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id: string, updateBlogDto: UpdateBlogDto) {
    await this.findOneById(id);

    const data: any = { ...updateBlogDto };
    if (updateBlogDto.slug) {
      data.slug = this.generateSlug(updateBlogDto.slug);
    } else if (updateBlogDto.title) {
      data.slug = this.generateSlug(updateBlogDto.title);
    }

    if (typeof updateBlogDto.tags === 'string') {
      data.tags = (updateBlogDto.tags as string).split(',').map((t) => t.trim());
    }

    if (updateBlogDto.coverImage) {
      data.coverImage = await this.processCoverImage(updateBlogDto.coverImage);
    }

    return this.prisma.blogPost.update({
      where: { id },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOneById(id);
    return this.prisma.blogPost.delete({
      where: { id },
    });
  }
}
