import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { User } from '@app/database/entities/user.entity';
import { UserPermission } from '@app/database/entities/user-permission.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { RedisTokenStore } from './redis-token-store.service';
import { MicrosoftAuthProvider } from './microsoft-auth.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([User, UserPermission]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default-jwt-secret-change-in-production'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES_IN', '1h')) as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, RedisTokenStore, MicrosoftAuthProvider],
})
export class AuthModule {}
