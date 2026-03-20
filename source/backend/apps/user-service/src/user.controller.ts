import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { UserService } from './user.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── User CRUD ───

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_ALL)
  async findAll(data: any) {
    return this.userService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_ID)
  async findById(data: any) {
    return this.userService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_USERNAME)
  async findByUsername(data: any) {
    return this.userService.findByUsername(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_EMAIL)
  async findByEmail(data: any) {
    return this.userService.findByEmail(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_MS365_ID)
  async findByMs365Id(data: any) {
    return this.userService.findByMs365Id(data);
  }

  // USER_CREATE removed — users are managed in DR.dbo.shainList directly

  @MessagePattern(MESSAGE_PATTERNS.USER_UPDATE_PROFILE)
  async updateProfile(data: any) {
    return this.userService.updateProfile(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_ADMIN_UPDATE)
  async adminUpdate(data: any) {
    return this.userService.adminUpdate(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_DEACTIVATE)
  async deactivate(data: any) {
    return this.userService.deactivate(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_UPDATE_LAST_LOGIN)
  async updateLastLogin(data: any) {
    return this.userService.updateLastLogin(data);
  }

  // ─── Stats ───

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_STATS)
  async getStats(data: any) {
    return this.userService.getStats(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_POSTS)
  async getUserPosts(data: any) {
    return this.userService.getUserPosts(data);
  }

  // ─── Permissions ───

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_PERMISSIONS)
  async getPermissions(data: any) {
    return this.userService.getPermissions(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_GRANT_PERMISSION)
  async grantPermission(data: any) {
    return this.userService.grantPermission(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_REVOKE_PERMISSION)
  async revokePermission(data: any) {
    return this.userService.revokePermission(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_SET_PERMISSIONS)
  async setPermissions(data: any) {
    return this.userService.setPermissions(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_LIST_ALL_PERMISSIONS)
  async listAllPermissions() {
    return this.userService.getAllPermissions();
  }
}
