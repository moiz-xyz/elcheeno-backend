import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(fileInput: string, folder = 'elcheeno/sellers'): Promise<string> {
    if (!fileInput) return '';

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');

    if (cloudName && cloudName !== 'your_cloud_name') {
      try {
        const res = await cloudinary.uploader.upload(fileInput, {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        });
        if (res && res.secure_url) {
          return res.secure_url;
        }
      } catch (error) {
        console.error('Cloudinary upload error:', error);
      }
    }

    // Return empty string if Cloudinary fails so caller can execute disk fallback
    return '';
  }
}
