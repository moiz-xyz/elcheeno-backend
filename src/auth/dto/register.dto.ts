import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  name: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  sellerName?: string;

  @IsString()
  @IsOptional()
  niche?: string;

  @IsString()
  @IsOptional()
  discord?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @IsOptional()
  accountType?: string; // 'BUYER' | 'SELLER'

  @IsString()
  @IsOptional()
  role?: string; // 'BUYER' | 'SELLER'
}
