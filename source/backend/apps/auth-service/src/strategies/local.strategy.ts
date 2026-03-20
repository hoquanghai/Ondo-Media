import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Local authentication strategy.
 *
 * In a microservice architecture, the actual Passport local strategy
 * is not used since the auth-service communicates via TCP message patterns.
 * This class provides the same validate logic for direct use if needed.
 *
 * Note: To use Passport's LocalStrategy, install `passport-local` and `@types/passport-local`.
 */
@Injectable()
export class LocalAuthStrategy {
  constructor(private readonly authService: AuthService) {}

  async validate(shainBangou: number, password?: string) {
    const result = await this.authService.login({ shainBangou, password });
    if (!result) {
      throw new UnauthorizedException(
        '社員番号またはパスワードが正しくありません',
      );
    }
    return result;
  }
}
