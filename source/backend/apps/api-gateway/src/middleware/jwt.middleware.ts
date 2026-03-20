import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { MESSAGE_PATTERNS, SERVICE_TOKENS } from '@app/common';

/**
 * Middleware that extracts the JWT from the Authorization header,
 * validates it via the auth-service, and attaches the user payload to the request.
 */
@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    @Inject(SERVICE_TOKENS.AUTH_SERVICE)
    private readonly authClient: ClientProxy,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // Let guards decide if auth is required
    }

    const token = authHeader.slice(7);
    try {
      const payload = await firstValueFrom(
        this.authClient.send(MESSAGE_PATTERNS.AUTH_VALIDATE_TOKEN, { token }),
      );
      (req as any).user = {
        shainBangou: payload.sub,
        shainName: payload.shainName,
        shainGroup: payload.shainGroup,
        email: payload.email,
        permissions: payload.permissions ?? [],
        hasPassword: payload.hasPassword ?? false,
      };
    } catch {
      throw new UnauthorizedException('無効または期限切れのトークンです');
    }
    next();
  }
}
