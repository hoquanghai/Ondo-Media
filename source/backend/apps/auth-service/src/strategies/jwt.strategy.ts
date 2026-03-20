import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload } from '../token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_SECRET',
        'default-jwt-secret-change-in-production',
      ),
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
