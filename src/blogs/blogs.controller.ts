import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  async findAll(@Query('category') category?: string, @Query('search') search?: string) {
    return this.blogsService.findAll(category, search);
  }

  @Get('slug/:slug')
  async findOneBySlug(@Param('slug') slug: string) {
    return this.blogsService.findOneBySlug(slug);
  }

  @Get(':id')
  async findOneById(@Param('id') id: string) {
    return this.blogsService.findOneById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  async uploadImage(@Body('image') image: string) {
    const url = await this.blogsService.uploadImageToCloudinary(image);
    return { imageUrl: url };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createBlogDto: CreateBlogDto, @Request() req: any) {
    return this.blogsService.create(createBlogDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogsService.update(id, updateBlogDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.blogsService.remove(id);
  }
}
