import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
}

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  /**
   * Compress and optionally resize an image.
   * - Max width: 1920px (preserving aspect ratio).
   * - Quality: 80 for JPEG.
   */
  async compress(
    input: Buffer,
    options?: { maxWidth?: number; quality?: number },
  ): Promise<ProcessedImage> {
    const maxWidth = options?.maxWidth ?? 1920;
    const quality = options?.quality ?? 80;

    const pipeline = sharp(input)
      .resize({
        width: maxWidth,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality, mozjpeg: true });

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    this.logger.log(
      `Image compressed: ${input.length} -> ${outputBuffer.length} bytes`,
    );

    return {
      buffer: outputBuffer,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: 'jpeg',
    };
  }

  /**
   * Generate a thumbnail (200x200, center crop).
   */
  async generateThumbnail(input: Buffer, size = 200): Promise<Buffer> {
    return sharp(input)
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 70 })
      .toBuffer();
  }

  /**
   * Get image metadata without processing.
   */
  async getMetadata(input: Buffer) {
    return sharp(input).metadata();
  }
}
