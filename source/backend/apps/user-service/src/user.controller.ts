import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ─── User CRUD ───

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_ALL)
  async findAll(@Payload() data: any) {
    return this.userService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_ID)
  async findById(@Payload() data: any) {
    return this.userService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_USERNAME)
  async findByUsername(@Payload() data: any) {
    return this.userService.findByUsername(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_EMAIL)
  async findByEmail(@Payload() data: any) {
    return this.userService.findByEmail(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_FIND_BY_MS365_ID)
  async findByMs365Id(@Payload() data: any) {
    return this.userService.findByMs365Id(data);
  }

  // USER_CREATE removed — users are managed in DR.dbo.shainList directly

  @MessagePattern(MESSAGE_PATTERNS.USER_UPDATE_PROFILE)
  async updateProfile(@Payload() data: any) {
    return this.userService.updateProfile(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_ADMIN_UPDATE)
  async adminUpdate(@Payload() data: any) {
    return this.userService.adminUpdate(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_DEACTIVATE)
  async deactivate(@Payload() data: any) {
    return this.userService.deactivate(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_UPDATE_LAST_LOGIN)
  async updateLastLogin(@Payload() data: any) {
    return this.userService.updateLastLogin(data);
  }

  // ─── Stats ───

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_STATS)
  async getStats(@Payload() data: any) {
    return this.userService.getStats(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_POSTS)
  async getUserPosts(@Payload() data: any) {
    return this.userService.getUserPosts(data);
  }

  // ─── Permissions ───

  @MessagePattern(MESSAGE_PATTERNS.USER_GET_PERMISSIONS)
  async getPermissions(@Payload() data: any) {
    return this.userService.getPermissions(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_GRANT_PERMISSION)
  async grantPermission(@Payload() data: any) {
    return this.userService.grantPermission(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_REVOKE_PERMISSION)
  async revokePermission(@Payload() data: any) {
    return this.userService.revokePermission(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_SET_PERMISSIONS)
  async setPermissions(@Payload() data: any) {
    return this.userService.setPermissions(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.USER_LIST_ALL_PERMISSIONS)
  async listAllPermissions() {
    return this.userService.getAllPermissions();
  }
}
