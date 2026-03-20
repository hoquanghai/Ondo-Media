# Phase 08 — File Service

## Objectives

- Create the `file-service` microservice (port 3007, NestJS TCP transport).
- Implement MinIO client for upload, download, and delete operations.
- Compress images with Sharp (resize, quality reduction).
- Compress videos with FFmpeg (transcode to H.264, reduce resolution).
- Generate thumbnails for images and video keyframes.
- Validate files: 20MB max for non-media, content-type validation.
- Generate signed URLs for secure, time-limited file access.

---

## Prerequisites

- Phases 01-02 complete.
- MinIO running on port 9000.
- FFmpeg installed on the host or available in the service container.

### Additional Packages

```bash
pnpm add minio sharp fluent-ffmpeg
pnpm add -D @types/fluent-ffmpeg
```

---

## Tasks

### 1. Scaffold the File Service

```bash
nest generate app file-service
```

#### `apps/file-service/src/main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FileServiceModule } from './file-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    FileServiceModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3007 },
    },
  );
  await app.listen();
  console.log('File service listening on TCP port 3007');
}
bootstrap();
```

### 2. File Record Entity

**File**: `libs/database/src/entities/file-record.entity.ts`

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('file_records')
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ type: 'nvarchar', length: 255 })
  original_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'bigint' })
  size: number; // bytes

  @Column({ type: 'varchar', length: 500 })
  object_key: string; // MinIO object key

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_key: string; // MinIO object key for thumbnail

  @Column({ type: 'varchar', length: 20 })
  category: string; // 'image', 'video', 'document', 'other'

  @Column({ default: false })
  is_compressed: boolean;

  @CreateDateColumn()
  uploaded_at: Date;
}
```

### 3. File Service Module

**File**: `apps/file-service/src/file-service.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { FileRecord } from '@app/database/entities/file-record.entity';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { MinioService } from './minio.service';
import { ImageProcessorService } from './image-processor.service';
import { VideoProcessorService } from './video-processor.service';
import { FileValidatorService } from './file-validator.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([FileRecord]),
  ],
  controllers: [FileController],
  providers: [
    FileService,
    MinioService,
    ImageProcessorService,
    VideoProcessorService,
    FileValidatorService,
  ],
})
export class FileServiceModule {}
```

### 4. MinIO Client Service

**File**: `apps/file-service/src/minio.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;
  private readonly logger = new Logger(MinioService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'social-uploads');

    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    // Ensure bucket exists
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
      this.logger.log(`Created bucket: ${this.bucket}`);
    }
  }

  async upload(
    objectKey: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  async download(objectKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, objectKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  async getSignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(
      this.bucket,
      objectKey,
      expirySeconds,
    );
  }

  async getSignedUploadUrl(
    objectKey: string,
    expirySeconds = 600,
  ): Promise<string> {
    return this.client.presignedPutObject(
      this.bucket,
      objectKey,
      expirySeconds,
    );
  }
}
```

### 5. Image Processor Service

**File**: `apps/file-service/src/image-processor.service.ts`

```typescript
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
   * - Quality: 80 for JPEG, 6 for PNG compression level.
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
   * Generate a thumbnail (300x300, cover crop).
   */
  async generateThumbnail(
    input: Buffer,
    size = 300,
  ): Promise<Buffer> {
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
```

### 6. Video Processor Service

**File**: `apps/file-service/src/video-processor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { randomUUID } from 'crypto';

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);

  /**
   * Transcode video to H.264 MP4, reduce resolution to 720p max.
   */
  async compress(inputBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${randomUUID()}.input`);
    const outputPath = path.join(tmpDir, `${randomUUID()}.mp4`);

    try {
      await fs.writeFile(inputPath, inputBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v libx264',
            '-preset fast',
            '-crf 28',
            '-vf scale=-2:720', // Max 720p height, keep aspect ratio
            '-c:a aac',
            '-b:a 128k',
            '-movflags +faststart',
          ])
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      const outputBuffer = await fs.readFile(outputPath);
      this.logger.log(
        `Video compressed: ${inputBuffer.length} -> ${outputBuffer.length} bytes`,
      );
      return outputBuffer;
    } finally {
      // Cleanup temp files
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }

  /**
   * Extract a thumbnail frame at 1 second (or first frame).
   */
  async generateThumbnail(inputBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputPath = path.join(tmpDir, `${randomUUID()}.input`);
    const outputPath = path.join(tmpDir, `${randomUUID()}.jpg`);

    try {
      await fs.writeFile(inputPath, inputBuffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: path.basename(outputPath),
            folder: tmpDir,
            size: '300x?',
          })
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      return await fs.readFile(outputPath);
    } finally {
      await fs.unlink(inputPath).catch(() => {});
      await fs.unlink(outputPath).catch(() => {});
    }
  }
}
```

### 7. File Validator Service

**File**: `apps/file-service/src/file-validator.service.ts`

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';

interface ValidationResult {
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
      throw new BadRequestException(result.error);
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
```

### 8. File Service Logic

**File**: `apps/file-service/src/file.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FileRecord } from '@app/database/entities/file-record.entity';
import { MinioService } from './minio.service';
import { ImageProcessorService } from './image-processor.service';
import { VideoProcessorService } from './video-processor.service';
import { FileValidatorService } from './file-validator.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileRecord)
    private readonly fileRepo: Repository<FileRecord>,
    private readonly minio: MinioService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly videoProcessor: VideoProcessorService,
    private readonly validator: FileValidatorService,
  ) {}

  async upload(data: {
    userId: string;
    originalName: string;
    mimeType: string;
    buffer: string; // base64-encoded
  }) {
    const buffer = Buffer.from(data.buffer, 'base64');
    const category = this.validator.validateOrThrow(data.mimeType, buffer.length);

    const fileId = randomUUID();
    let uploadBuffer = buffer;
    let thumbnailKey: string | null = null;
    let isCompressed = false;
    let contentType = data.mimeType;

    // Process images
    if (category === 'image' && !data.mimeType.includes('svg')) {
      const compressed = await this.imageProcessor.compress(buffer);
      uploadBuffer = compressed.buffer;
      contentType = 'image/jpeg';
      isCompressed = true;

      // Generate thumbnail
      const thumbnail = await this.imageProcessor.generateThumbnail(buffer);
      thumbnailKey = `thumbnails/${fileId}.jpg`;
      await this.minio.upload(thumbnailKey, thumbnail, 'image/jpeg');
    }

    // Process videos
    if (category === 'video') {
      uploadBuffer = await this.videoProcessor.compress(buffer);
      contentType = 'video/mp4';
      isCompressed = true;

      // Generate video thumbnail
      const thumbnail = await this.videoProcessor.generateThumbnail(buffer);
      thumbnailKey = `thumbnails/${fileId}.jpg`;
      await this.minio.upload(thumbnailKey, thumbnail, 'image/jpeg');
    }

    // Upload to MinIO
    const objectKey = `uploads/${fileId}/${data.originalName}`;
    await this.minio.upload(objectKey, uploadBuffer, contentType);

    // Save record
    const record = this.fileRepo.create({
      id: fileId,
      uploadedBy: { id: data.userId } as any,
      original_name: data.originalName,
      mime_type: contentType,
      size: uploadBuffer.length,
      object_key: objectKey,
      thumbnail_key: thumbnailKey,
      category,
      is_compressed: isCompressed,
    });

    return this.fileRepo.save(record);
  }

  async getSignedUrl(fileId: string) {
    const record = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!record) throw new NotFoundException('File not found');

    const url = await this.minio.getSignedUrl(record.object_key);
    const thumbnailUrl = record.thumbnail_key
      ? await this.minio.getSignedUrl(record.thumbnail_key)
      : null;

    return {
      id: record.id,
      originalName: record.original_name,
      mimeType: record.mime_type,
      size: record.size,
      category: record.category,
      url,
      thumbnailUrl,
    };
  }

  async download(fileId: string) {
    const record = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!record) throw new NotFoundException('File not found');

    const buffer = await this.minio.download(record.object_key);
    return {
      buffer: buffer.toString('base64'),
      mimeType: record.mime_type,
      originalName: record.original_name,
    };
  }

  async delete(fileId: string, userId: string) {
    const record = await this.fileRepo.findOne({
      where: { id: fileId },
      relations: ['uploadedBy'],
    });
    if (!record) throw new NotFoundException('File not found');

    // Delete from MinIO
    await this.minio.delete(record.object_key);
    if (record.thumbnail_key) {
      await this.minio.delete(record.thumbnail_key);
    }

    // Delete DB record
    await this.fileRepo.delete(fileId);
    return { deleted: true };
  }

  async getUploadUrl(data: { fileName: string; mimeType: string }) {
    const fileId = randomUUID();
    const objectKey = `uploads/${fileId}/${data.fileName}`;
    const url = await this.minio.getSignedUploadUrl(objectKey);
    return { fileId, objectKey, uploadUrl: url };
  }
}
```

### 9. File Controller (TCP)

**File**: `apps/file-service/src/file.controller.ts`

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileService } from './file.service';

@Controller()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @MessagePattern('file.upload')
  async upload(@Payload() data: {
    userId: string;
    originalName: string;
    mimeType: string;
    buffer: string;
  }) {
    return this.fileService.upload(data);
  }

  @MessagePattern('file.getSignedUrl')
  async getSignedUrl(@Payload() data: { fileId: string }) {
    return this.fileService.getSignedUrl(data.fileId);
  }

  @MessagePattern('file.download')
  async download(@Payload() data: { fileId: string }) {
    return this.fileService.download(data.fileId);
  }

  @MessagePattern('file.delete')
  async delete(@Payload() data: { fileId: string; userId: string }) {
    return this.fileService.delete(data.fileId, data.userId);
  }

  @MessagePattern('file.getUploadUrl')
  async getUploadUrl(@Payload() data: { fileName: string; mimeType: string }) {
    return this.fileService.getUploadUrl(data);
  }
}
```

### 10. API Gateway File Controllers

**File**: `apps/api-gateway/src/files/files.controller.ts`

```typescript
import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { CurrentUser, JwtAuthGuard, SERVICE_TOKENS } from '@app/common';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/files')
export class FilesController {
  constructor(
    @Inject(SERVICE_TOKENS.FILE_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return firstValueFrom(
      this.client.send('file.upload', {
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer.toString('base64'),
      }),
    );
  }

  @Get(':id')
  async getSignedUrl(@Param('id') fileId: string) {
    return firstValueFrom(
      this.client.send('file.getSignedUrl', { fileId }),
    );
  }

  @Get(':id/download')
  async download(@Param('id') fileId: string) {
    return firstValueFrom(
      this.client.send('file.download', { fileId }),
    );
  }

  @Delete(':id')
  async delete(
    @Param('id') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return firstValueFrom(
      this.client.send('file.delete', { fileId, userId }),
    );
  }
}
```

---

## Verification Checklist

- [ ] `file-service` starts and listens on TCP port 3007.
- [ ] `POST /api/files/upload` with a JPEG image compresses and stores in MinIO.
- [ ] Uploaded images are resized to max 1920px width.
- [ ] A thumbnail (300x300) is generated for images.
- [ ] `POST /api/files/upload` with a video transcodes to H.264 MP4 at 720p max.
- [ ] A thumbnail frame is extracted from videos.
- [ ] `GET /api/files/:id` returns a signed URL valid for 1 hour.
- [ ] `GET /api/files/:id/download` returns the file content.
- [ ] `DELETE /api/files/:id` removes the file from MinIO and the DB record.
- [ ] Uploading a file > 20MB (non-media) returns 400.
- [ ] Uploading an unsupported file type returns 400.
- [ ] MinIO bucket `social-uploads` is auto-created on service startup.
- [ ] File records include original name, mime type, size, and category.

---

## Files Created / Modified

| File | Purpose |
|------|---------|
| `apps/file-service/src/main.ts` | File service bootstrap (TCP port 3007) |
| `apps/file-service/src/file-service.module.ts` | Module with all providers |
| `apps/file-service/src/file.controller.ts` | TCP message pattern handlers |
| `apps/file-service/src/file.service.ts` | Upload, download, delete, URL logic |
| `apps/file-service/src/minio.service.ts` | MinIO client wrapper |
| `apps/file-service/src/image-processor.service.ts` | Sharp-based image compression |
| `apps/file-service/src/video-processor.service.ts` | FFmpeg-based video compression |
| `apps/file-service/src/file-validator.service.ts` | Size and MIME type validation |
| `libs/database/src/entities/file-record.entity.ts` | File record entity |
| `apps/api-gateway/src/files/files.controller.ts` | Gateway file endpoints |
