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
            { width: 1000, crop: 'limit' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        });
        return res.secure_url;
      } catch (error) {
        console.error('Cloudinary upload error:', error);
      }
    }

    // Local Disk Fallback if base64 image and Cloudinary is not configured or fails
    if (fileInput.startsWith('data:image/')) {
      try {
        const match = fileInput.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (match) {
          const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
          const buffer = Buffer.from(match[2], 'base64');
          const fileName = `seller-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;

          const uploadDir = path.join(process.cwd(), '..', 'public', 'uploads', 'sellers');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const filePath = path.join(uploadDir, fileName);
          fs.writeFileSync(filePath, buffer);

          return `/uploads/sellers/${fileName}`;
        }
      } catch (err) {
        console.error('Local fallback seller avatar save error:', err);
      }
    }

    return fileInput;
  }
}
