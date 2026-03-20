import * as sharp from 'sharp';

export interface ProcessedFile {
  buffer: Buffer;
  size: number;
  mimeType: string;
  ext: string;
}

/**
 * Image compression settings
 */
const IMAGE_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 80,           // JPEG quality
  pngCompressionLevel: 8,
  webpQuality: 80,
};

/**
 * Thumbnail settings
 */
const THUMB_CONFIG = {
  width: 400,
  height: 400,
  quality: 70,
};

/**
 * Compress an image using sharp.
 * - Resize to max 1920x1920 maintaining aspect ratio
 * - JPEG: quality 80
 * - PNG: compression level 8
 * - WebP: quality 80
 * - GIF: pass through (sharp doesn't handle animated GIF well)
 */
export async function compressImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ProcessedFile> {
  // GIF: pass through (animated GIFs are complex)
  if (mimeType === 'image/gif') {
    return { buffer, size: buffer.length, mimeType, ext: 'gif' };
  }

  let pipeline = sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true, // Don't upscale small images
    });

  let ext: string;
  let outputMimeType: string;

  if (mimeType === 'image/png') {
    pipeline = pipeline.png({ compressionLevel: IMAGE_CONFIG.pngCompressionLevel });
    ext = 'png';
    outputMimeType = 'image/png';
  } else if (mimeType === 'image/webp') {
    pipeline = pipeline.webp({ quality: IMAGE_CONFIG.webpQuality });
    ext = 'webp';
    outputMimeType = 'image/webp';
  } else {
    // Default to JPEG for everything else
    pipeline = pipeline.jpeg({ quality: IMAGE_CONFIG.quality, mozjpeg: true });
    ext = 'jpg';
    outputMimeType = 'image/jpeg';
  }

  const outputBuffer = await pipeline.toBuffer();

  // Only use compressed version if it's actually smaller
  if (outputBuffer.length < buffer.length) {
    return {
      buffer: outputBuffer,
      size: outputBuffer.length,
      mimeType: outputMimeType,
      ext,
    };
  }

  // Original was smaller, keep it
  const originalExt = mimeType.split('/')[1] || 'jpg';
  return { buffer, size: buffer.length, mimeType, ext: originalExt };
}

/**
 * Generate a thumbnail for an image.
 */
export async function generateThumbnail(
  buffer: Buffer,
): Promise<ProcessedFile> {
  const thumbBuffer = await sharp(buffer)
    .rotate()
    .resize(THUMB_CONFIG.width, THUMB_CONFIG.height, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: THUMB_CONFIG.quality, mozjpeg: true })
    .toBuffer();

  return {
    buffer: thumbBuffer,
    size: thumbBuffer.length,
    mimeType: 'image/jpeg',
    ext: 'jpg',
  };
}

/**
 * Get image metadata (dimensions)
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? 'unknown',
  };
}

/**
 * Check if video exceeds max resolution (1080p = 1920x1080)
 * Since we can't transcode without ffmpeg, we just validate.
 * Frontend should compress before upload.
 */
export function getVideoMaxSize(): number {
  return 100 * 1024 * 1024; // 100MB max for video
}

export function getImageMaxSize(): number {
  return 20 * 1024 * 1024; // 20MB max for image (before compression)
}
