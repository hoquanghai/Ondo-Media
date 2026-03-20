import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { FileGatewayController } from './file.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.FILE_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('FILE_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('FILE_SERVICE_PORT', '3017'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [FileGatewayController],
  exports: [ClientsModule],
})
export class FileGatewayModule {}
