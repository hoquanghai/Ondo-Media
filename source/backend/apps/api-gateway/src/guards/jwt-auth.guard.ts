import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@app/common/decorators/public.decorator';

/**
 * Global JWT auth guard for the API Gateway.
 * Checks if the route is marked as @Public() — if so, allows access.
 * Otherwise, requires a valid user object on the request (set by JwtMiddleware).
 */
@Injectable()
export class GatewayJwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request.user) {
      throw new UnauthorizedException('認証が必要です');
    }
    return true;
  }
}
