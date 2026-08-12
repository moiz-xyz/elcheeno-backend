import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(fileInput: string, folder = 'elcheeno/blogs'): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');

    // If Cloudinary is not configured yet in .env
    if (!cloudName || cloudName === 'your_cloud_name') {
      return fileInput;
    }

    try {
      const res = await cloudinary.uploader.upload(fileInput, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1600, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      });
      return res.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return fileInput;
    }
  }
}
