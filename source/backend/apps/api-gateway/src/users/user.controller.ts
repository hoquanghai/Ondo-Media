import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
  RequirePermissions,
  PermissionsGuard,
} from '@app/common';

@Controller('users')
export class UserController {
  private minioClient: Minio.Client;
  private readonly bucket: string;

  constructor(
    @Inject(SERVICE_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'social-uploads');
    this.minioClient = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: parseInt(this.config.get<string>('MINIO_PORT', '9000'), 10),
      useSSL: this.config.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });
    // Ensure bucket exists
    this.minioClient.bucketExists(this.bucket).then((exists) => {
      if (!exists) {
        this.minioClient.makeBucket(this.bucket).catch(() => {});
      }
    }).catch(() => {});
  }

  // ─── User List (any authenticated user) ───

  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('department') department?: string,
  ) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_FIND_ALL, {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        search,
        department,
      }),
    );
  }

  // ─── Get current user's profile ───

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_FIND_BY_ID, {
        id: user.shainBangou,
      }),
    );
  }

  // ─── Update current user's profile ───

  @Patch('me')
  async updateMe(
    @CurrentUser() user: any,
    @Body() body: Record<string, any>,
  ) {
    // Whitelist allowed fields - prevent setting sensitive fields
    const allowed = ['shainName', 'email', 'phone', 'mobile', 'birthday', 'address1', 'snsBio', 'snsAvatarUrl'];
    const sanitized: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) sanitized[key] = body[key];
    }
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_UPDATE_PROFILE, {
        id: user.shainBangou,
        ...sanitized,
      }),
    );
  }

  // ─── Upload avatar ───

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  }))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { success: false, message: 'ファイルが選択されていません' };
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return { success: false, message: '画像ファイルのみアップロードできます' };
    }

    // Upload to MinIO
    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectName = `avatars/${user.shainBangou}_${uuidv4().slice(0, 8)}.${ext}`;

    await this.minioClient.putObject(
      this.bucket,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    // Build public URL
    const minioEndpoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const minioPort = this.config.get<string>('MINIO_PORT', '9000');
    const url = `http://${minioEndpoint}:${minioPort}/${this.bucket}/${objectName}`;

    // Update user's sns_avatar_url
    await firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_UPDATE_PROFILE, {
        id: user.shainBangou,
        snsAvatarUrl: url,
      }),
    );

    return { url };
  }

  // ─── Get current user's stats ───

  @Get('me/stats')
  async getMyStats(@CurrentUser() user: any) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_GET_STATS, {
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Get specific user by shainBangou ───

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_FIND_BY_ID, { id }),
    );
  }

  // ─── Update user (admin) ───

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin.users')
  async adminUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      displayName?: string;
      department?: string;
      position?: string;
      isActive?: boolean;
      bio?: string;
    },
  ) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_ADMIN_UPDATE, {
        id,
        ...body,
      }),
    );
  }

  // ─── Deactivate user (admin) ───

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin.users')
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_DEACTIVATE, { id }),
    );
  }

  // ─── Get user stats ───

  @Get(':id/stats')
  async getStats(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_GET_STATS, { userId: id }),
    );
  }

  // ─── Get user posts ───

  @Get(':id/posts')
  async getUserPosts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('date') date?: string,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_BY_USER_ID, {
        userId: id,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        date,
      }),
    );
  }

  // ─── Permissions (admin) ───

  @Get(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin')
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_GET_PERMISSIONS, {
        userId: id,
      }),
    );
  }

  @Post(':id/permissions')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin')
  async grantPermission(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() body: { permissionName: string },
  ) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_GRANT_PERMISSION, {
        userId: id,
        permissionName: body.permissionName,
        grantedBy: user.shainBangou,
      }),
    );
  }

  @Delete(':id/permissions/:permissionId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('admin')
  async revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permissionId') permissionId: string,
  ) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_REVOKE_PERMISSION, {
        userId: id,
        permissionId,
      }),
    );
  }
}
