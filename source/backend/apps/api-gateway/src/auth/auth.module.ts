import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.AUTH_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('AUTH_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('AUTH_SERVICE_PORT', '3001'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  exports: [ClientsModule],
})
export class AuthGatewayModule {}
