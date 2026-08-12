import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsEmail({}, { message: 'Valid email address is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  message: string;

  @IsString()
  @IsOptional()
  blogId?: string;

  @IsString()
  @IsOptional()
  blogSlug?: string;
}
