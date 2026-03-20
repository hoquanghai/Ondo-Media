import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FileRecord } from '@app/database';
import { MinioService } from './minio.service';
import { ImageProcessorService } from './image-processor.service';
import { VideoProcessorService } from './video-processor.service';
import { FileValidatorService } from './file-validator.service';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
    private readonly minio: MinioService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly videoProcessor: VideoProcessorService,
    private readonly validator: FileValidatorService,
  ) {}

  async upload(data: {
    userId: number;
    originalName: string;
    mimeType: string;
    buffer: string; // base64-encoded
  }) {
    const buffer = Buffer.from(data.buffer, 'base64');
    const category = this.validator.validateOrThrow(data.mimeType, buffer.length);

    const fileId = randomUUID();
    let uploadBuffer = buffer;
    let thumbnailKey: string | undefined = undefined;
    let isCompressed = false;
    let contentType = data.mimeType;

    // Process images (skip SVG)
    if (category === 'image' && !data.mimeType.includes('svg')) {
      try {
        const compressed = await this.imageProcessor.compress(buffer);
        uploadBuffer = Buffer.from(compressed.buffer);
        contentType = 'image/jpeg';
        isCompressed = true;

        // Generate thumbnail
        const thumbnail = await this.imageProcessor.generateThumbnail(buffer);
        thumbnailKey = `thumbnails/${fileId}.jpg`;
        await this.minio.upload(thumbnailKey, thumbnail, 'image/jpeg');
      } catch (err) {
        this.logger.warn(`Image compression failed, uploading original: ${err}`);
        // Fall back to original
        uploadBuffer = buffer;
        contentType = data.mimeType;
        isCompressed = false;
      }
    }

    // Process videos: transcode to H.264 MP4, max 1080p
    if (category === 'video') {
      try {
        uploadBuffer = Buffer.from(await this.videoProcessor.compress(buffer));
        contentType = 'video/mp4';
        isCompressed = true;

        // Generate video thumbnail
        const thumbnail = await this.videoProcessor.generateThumbnail(buffer);
        thumbnailKey = `thumbnails/${fileId}.jpg`;
        await this.minio.upload(thumbnailKey, thumbnail, 'image/jpeg');
      } catch (err) {
        this.logger.warn(`Video compression failed, uploading original: ${err}`);
        // Fall back to original
        uploadBuffer = buffer;
        contentType = data.mimeType;
        isCompressed = false;
      }
    }

    // Upload to MinIO
    const objectKey = `uploads/${fileId}/${data.originalName}`;
    await this.minio.upload(objectKey, uploadBuffer, contentType);

    // Save record
    const record = this.fileRepo.create({
      uploadedBy: data.userId,
      originalName: data.originalName,
      mimeType: contentType,
      size: uploadBuffer.length,
      objectKey,
      thumbnailKey,
      category,
      isCompressed,
    });

    const saved: FileRecord = await this.fileRepo.save(record as FileRecord);
    this.logger.log(`File uploaded: ${saved.id} (${category}, ${uploadBuffer.length} bytes)`);

    return {
      id: saved.id,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      size: saved.size,
      category: saved.category,
      objectKey: saved.objectKey,
      thumbnailKey: saved.thumbnailKey,
      isCompressed: saved.isCompressed,
      uploadedAt: saved.uploadedAt,
    };
  }

  async getUrl(data: { fileId: string }) {
    const record = await this.fileRepo.findOne({
      where: { id: data.fileId, isDeleted: false },
    });
    if (!record) {
      throw new Error('File not found');
    }

    const url = await this.minio.getSignedUrl(record.objectKey);
    const thumbnailUrl = record.thumbnailKey
      ? await this.minio.getSignedUrl(record.thumbnailKey)
      : null;

    return {
      id: record.id,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      category: record.category,
      url,
      thumbnailUrl,
    };
  }

  async getInfo(data: { fileId: string }) {
    const record = await this.fileRepo.findOne({
      where: { id: data.fileId, isDeleted: false },
    });
    if (!record) {
      throw new Error('File not found');
    }

    return {
      id: record.id,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      category: record.category,
      isCompressed: record.isCompressed,
      uploadedAt: record.uploadedAt,
    };
  }

  async delete(data: { fileId: string; userId: number }) {
    const record = await this.fileRepo.findOne({
      where: { id: data.fileId, isDeleted: false },
    });
    if (!record) {
      throw new Error('File not found');
    }

    // Delete from MinIO
    try {
      await this.minio.delete(record.objectKey);
      if (record.thumbnailKey) {
        await this.minio.delete(record.thumbnailKey);
      }
    } catch (err) {
      this.logger.warn(`Failed to delete from MinIO: ${err}`);
    }

    // Soft delete DB record
    await this.fileRepo.update(data.fileId, { isDeleted: true });
    this.logger.log(`File deleted: ${data.fileId}`);

    return { deleted: true };
  }
}
