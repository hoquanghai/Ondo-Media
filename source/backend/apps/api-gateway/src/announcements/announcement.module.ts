import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { AnnouncementGatewayController } from './announcement.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.ANNOUNCEMENT_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('ANNOUNCEMENT_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('ANNOUNCEMENT_SERVICE_PORT', '3014'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [AnnouncementGatewayController],
  exports: [ClientsModule],
})
export class AnnouncementGatewayModule {}
