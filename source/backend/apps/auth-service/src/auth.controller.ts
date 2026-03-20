import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(MESSAGE_PATTERNS.AUTH_LOGIN)
  async login(
    @Payload()
    data: { shainBangou: number; password?: string; rememberMe?: boolean },
  ) {
    return this.authService.login(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_LOGIN_MICROSOFT)
  async loginMicrosoft(
    @Payload()
    data: { code: string; redirectUri?: string; rememberMe?: boolean },
  ) {
    return this.authService.loginMicrosoft(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_REFRESH)
  async refresh(
    @Payload() data: { refreshToken: string; rememberMe?: boolean },
  ) {
    return this.authService.refresh(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_LOGOUT)
  async logout(
    @Payload() data: { accessToken: string; refreshToken?: string },
  ) {
    return this.authService.logout(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_VALIDATE_TOKEN)
  async validateToken(@Payload() data: { token: string }) {
    return this.authService.validateToken(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_GET_CURRENT_USER)
  async getCurrentUser(@Payload() data: { userId: number }) {
    return this.authService.getCurrentUser(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_CREATE_PASSWORD)
  async createPassword(
    @Payload() data: { shainBangou: number; password: string },
  ) {
    return this.authService.createPassword(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.AUTH_CHANGE_PASSWORD)
  async changePassword(
    @Payload()
    data: { shainBangou: number; oldPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(data);
  }
}
