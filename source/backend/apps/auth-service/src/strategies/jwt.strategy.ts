import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret || secret === 'change-me-to-a-real-secret') {
      console.warn('WARNING: JWT_SECRET is not set or is using default value. Set a strong secret in .env');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'dev-only-not-for-production-' + Date.now(),
    });
  }

  async validate(payload: AccessTokenPayload) {
    return {
      shainBangou: payload.sub,
      shainName: payload.shainName,
      shainGroup: payload.shainGroup,
      email: payload.email,
      permissions: payload.permissions,
      hasPassword: payload.hasPassword,
    };
  }
}
