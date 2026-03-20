import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  Public,
  SERVICE_TOKENS,
} from '@app/common';
import { CurrentUserPayload } from '@app/common/interfaces/current-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: '社員番号でログイン' })
  async login(
    @Body() body: { lastNumber: number; password?: string; rememberMe?: boolean },
  ) {
    try {
      const result = await firstValueFrom(
        this.authClient.send(MESSAGE_PATTERNS.AUTH_LOGIN, body),
      );
      return result;
    } catch (error) {
      console.error('Login error:', error?.message || error);
      throw error;
    }
  }

  @Post('login/microsoft')
  @Public()
  @ApiOperation({ summary: 'Microsoft 365 認証でログイン' })
  async loginMicrosoft(
    @Body() body: { code: string; redirectUri?: string; rememberMe?: boolean },
  ) {
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_LOGIN_MICROSOFT, body),
    );
  }

  @Post('refresh')
  @Public()
  @ApiOperation({ summary: 'アクセストークンをリフレッシュ' })
  async refresh(@Body() body: { refreshToken: string; rememberMe?: boolean }) {
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_REFRESH, body),
    );
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ログアウト（トークン無効化）' })
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() body: { refreshToken?: string },
  ) {
    const accessToken = authHeader?.replace('Bearer ', '') ?? '';
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_LOGOUT, {
        accessToken,
        refreshToken: body.refreshToken,
      }),
    );
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '現在のユーザー情報を取得' })
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_GET_CURRENT_USER, {
        userId: user.shainBangou,
      }),
    );
  }

  @Post('create-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'SNSパスワードを作成（初回設定）' })
  async createPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { password: string },
  ) {
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_CREATE_PASSWORD, {
        shainBangou: user.shainBangou,
        password: body.password,
      }),
    );
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'SNSパスワードを変更' })
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return firstValueFrom(
      this.authClient.send(MESSAGE_PATTERNS.AUTH_CHANGE_PASSWORD, {
        shainBangou: user.shainBangou,
        oldPassword: body.oldPassword,
        newPassword: body.newPassword,
      }),
    );
  }
}
