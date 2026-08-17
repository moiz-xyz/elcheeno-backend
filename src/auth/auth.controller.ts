import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-avatar')
  async uploadAvatar(@Body('image') image: string) {
    if (!image) {
      throw new BadRequestException('Image data is required');
    }
    const url = await this.cloudinaryService.uploadImage(image, 'elcheeno/sellers');
    return { url };
  }

  @Post('google')
  async googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleAuth(googleAuthDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Get('sellers')
  async getSellers() {
    return this.authService.getAllSellers();
  }

  @Get('buyers')
  async getBuyers() {
    return this.authService.getAllBuyers();
  }

  @Patch('sellers/:id/approve')
  async approveSeller(@Param('id') id: string) {
    return this.authService.approveSeller(id);
  }

  @Patch('sellers/:id/reject')
  async rejectSeller(@Param('id') id: string) {
    return this.authService.rejectSeller(id);
  }
}
