import { Controller, Post, Body, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Patch('sellers/:id/approve')
  async approveSeller(@Param('id') id: string) {
    return this.authService.approveSeller(id);
  }

  @Patch('sellers/:id/reject')
  async rejectSeller(@Param('id') id: string) {
    return this.authService.rejectSeller(id);
  }
}
