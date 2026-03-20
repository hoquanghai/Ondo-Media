import { compressImage, generateThumbnail } from '../utils/media-processor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
} from '@app/common';

@Controller('posts')
export class PostController {
  private minioClient: Minio.Client;
  private readonly bucket: string;
  private readonly minioEndpoint: string;
  private readonly minioPort: string;

  constructor(
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'social-uploads');
    this.minioEndpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    this.minioPort = this.config.get<string>('MINIO_PORT', '9000');
    this.minioClient = new Minio.Client({
      endPoint: this.minioEndpoint,
      port: parseInt(this.minioPort, 10),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
    // Ensure bucket exists
    this.minioClient
      .bucketExists(this.bucket)
      .then((exists) => {
        if (!exists) {
          this.minioClient.makeBucket(this.bucket).catch(() => {});
        }
      })
      .catch(() => {});
  }

  /**
   * Build a public MinIO URL for a given storage key.
   */
  private buildFileUrl(storageKey: string): string {
    return `http://${this.minioEndpoint}:${this.minioPort}/${this.bucket}/${storageKey}`;
  }

  /**
   * Determine file type category from MIME type.
   */
  private getFileType(mimeType: string): 'image' | 'video' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  }

  /**
   * Enrich a post response by adding fileUrl to each file record.
   */
  private enrichPostFiles(post: any): any {
    if (!post) return post;
    if (post.files && Array.isArray(post.files)) {
      post.files = post.files.map((f: any) => ({
        ...f,
        fileUrl: f.fileUrl || this.buildFileUrl(f.storageKey),
      }));
    }
    return post;
  }

  /**
   * Enrich paginated results with file URLs.
   */
  private enrichPaginatedFiles(result: any): any {
    if (!result) return result;
    if (result.items && Array.isArray(result.items)) {
      result.items = result.items.map((post: any) => this.enrichPostFiles(post));
    }
    return result;
  }

  // ─── Timeline / List ───

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const result = await firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_ALL, {
        date,
        userId: userId ? Number(userId) : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        sortBy,
        sortOrder,
        currentUserId: user?.shainBangou,
      }),
    );
    return this.enrichPaginatedFiles(result);
  }

  // ─── Date Counts (must be before :id route) ───

  @Get('dates')
  async getDateCounts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('userId') userId?: string,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_GET_DATE_COUNTS, {
        startDate,
        endDate,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        userId,
      }),
    );
  }

  // ─── Single Post ───

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_BY_ID, {
        id,
        currentUserId: user?.shainBangou,
      }),
    );
    return this.enrichPostFiles(result);
  }

  // ─── Create Post (supports both JSON and multipart/form-data) ───

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max per file
  }))
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      content: string;
      postDate: string;
      title?: string;
      attachments?: string[];
    },
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    // 1. Create the post via post-service TCP
    const post = await firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_CREATE, {
        userId: user.shainBangou,
        content: body.content,
        postDate: body.postDate,
        title: body.title,
        attachments: body.attachments,
      }),
    );

    // 2. If files were uploaded, upload to MinIO and create post_files records
    if (files && files.length > 0) {
      const fileRecords: Array<{
        postId: string;
        fileName: string;
        storageKey: string;
        fileSize: number;
        mimeType: string;
        fileType: string;
        sortOrder: number;
        createdBy: number;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = this.getFileType(file.mimetype);
        let uploadBuffer = file.buffer;
        let uploadSize = file.size;
        let uploadMimeType = file.mimetype;
        let ext = file.originalname.split('.').pop() || 'bin';

        // Compress images using sharp
        if (fileType === 'image' && file.mimetype !== 'image/gif') {
          try {
            const compressed = await compressImage(file.buffer, file.mimetype);
            uploadBuffer = compressed.buffer;
            uploadSize = compressed.size;
            uploadMimeType = compressed.mimeType;
            ext = compressed.ext;

            // Also generate and upload thumbnail
            const thumb = await generateThumbnail(file.buffer);
            const thumbKey = `posts/${post.id}/thumb_${uuidv4()}.${thumb.ext}`;
            await this.minioClient.putObject(
              this.bucket, thumbKey, thumb.buffer, thumb.size,
              { 'Content-Type': thumb.mimeType },
            );
          } catch (e) {
            // If compression fails, upload original
          }
        }

        // Validate video size (max 100MB)
        if (fileType === 'video' && uploadSize > 100 * 1024 * 1024) {
          continue; // Skip oversized videos
        }

        const storageKey = `posts/${post.id}/${uuidv4()}.${ext}`;

        // Upload to MinIO
        await this.minioClient.putObject(
          this.bucket,
          storageKey,
          uploadBuffer,
          uploadSize,
          { 'Content-Type': uploadMimeType },
        );

        fileRecords.push({
          postId: post.id,
          fileName: file.originalname,
          storageKey,
          fileSize: uploadSize,
          mimeType: uploadMimeType,
          fileType,
          sortOrder: i,
          createdBy: user.shainBangou,
        });
      }

      // 3. Create post_files records via post-service
      await firstValueFrom(
        this.postClient.send(MESSAGE_PATTERNS.POST_CREATE_FILES, {
          files: fileRecords,
        }),
      );

      // 4. Re-fetch the post with files included
      const fullPost = await firstValueFrom(
        this.postClient.send(MESSAGE_PATTERNS.POST_FIND_BY_ID, {
          id: post.id,
          currentUserId: user.shainBangou,
        }),
      );
      return this.enrichPostFiles(fullPost);
    }

    return this.enrichPostFiles(post);
  }

  // ─── Update Post ───

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      content?: string;
      title?: string;
      postDate?: string;
    },
  ) {
    const result = await firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_UPDATE, {
        id,
        userId: user.shainBangou,
        ...body,
      }),
    );
    return this.enrichPostFiles(result);
  }

  // ─── Delete Post ───

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_DELETE, {
        id,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Like ───

  @Post(':id/like')
  async like(
    @Param('id') postId: string,
    @CurrentUser() user: any,
    @Body() body?: { reactionType?: string },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_LIKE, {
        postId,
        userId: user.shainBangou,
        reactionType: body?.reactionType ?? 'like',
      }),
    );
  }

  @Delete(':id/like')
  async unlike(
    @Param('id') postId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_UNLIKE, {
        postId,
        userId: user.shainBangou,
      }),
    );
  }

  @Get(':id/likes')
  async getLikes(@Param('id') postId: string) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_GET_LIKES, { postId }),
    );
  }

  // ─── Comments ───

  @Get(':id/comments')
  async getComments(
    @Param('id') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_COMMENTS, {
        postId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      }),
    );
  }

  @Post(':id/comments')
  async createComment(
    @Param('id') postId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_CREATE_COMMENT, {
        postId,
        userId: user.shainBangou,
        content: body.content,
      }),
    );
  }
}
