import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { NotificationGatewayController } from './notification.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.NOTIFICATION_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('NOTIFICATION_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('NOTIFICATION_SERVICE_PORT', '3016'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [NotificationGatewayController],
  exports: [ClientsModule],
})
export class NotificationGatewayModule {}
