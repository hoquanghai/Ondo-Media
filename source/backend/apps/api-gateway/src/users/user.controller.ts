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
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
  RequirePermissions,
  PermissionsGuard,
} from '@app/common';

@Controller('users')
export class UserController {
  constructor(
    @Inject(SERVICE_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
  ) {}

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
    @Body() body: { displayName?: string; bio?: string; avatarUrl?: string },
  ) {
    return firstValueFrom(
      this.userClient.send(MESSAGE_PATTERNS.USER_UPDATE_PROFILE, {
        id: user.shainBangou,
        ...body,
      }),
    );
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
