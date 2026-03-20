import { Injectable } from '@nestjs/common';

export interface ValidationResult {
  valid: boolean;
  category: string;
  error?: string;
}

@Injectable()
export class FileValidatorService {
  // 20 MB for non-media files
  private readonly MAX_NON_MEDIA_SIZE = 20 * 1024 * 1024;

  // 100 MB for images, 500 MB for videos
  private readonly MAX_IMAGE_SIZE = 100 * 1024 * 1024;
  private readonly MAX_VIDEO_SIZE = 500 * 1024 * 1024;

  private readonly ALLOWED_MIME_TYPES: Record<string, string[]> = {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    video: [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
  };

  validate(mimeType: string, sizeBytes: number): ValidationResult {
    const category = this.getCategory(mimeType);

    if (category === 'unknown') {
      return {
        valid: false,
        category,
        error: `Unsupported file type: ${mimeType}`,
      };
    }

    const maxSize = this.getMaxSize(category);
    if (sizeBytes > maxSize) {
      const maxMB = Math.round(maxSize / (1024 * 1024));
      return {
        valid: false,
        category,
        error: `File size exceeds ${maxMB}MB limit for ${category} files`,
      };
    }

    return { valid: true, category };
  }

  validateOrThrow(mimeType: string, sizeBytes: number): string {
    const result = this.validate(mimeType, sizeBytes);
    if (!result.valid) {
      throw new Error(result.error);
    }
    return result.category;
  }

  private getCategory(mimeType: string): string {
    for (const [category, types] of Object.entries(this.ALLOWED_MIME_TYPES)) {
      if (types.includes(mimeType)) return category;
    }
    return 'unknown';
  }

  private getMaxSize(category: string): number {
    switch (category) {
      case 'image':
        return this.MAX_IMAGE_SIZE;
      case 'video':
        return this.MAX_VIDEO_SIZE;
      default:
        return this.MAX_NON_MEDIA_SIZE;
    }
  }
}
