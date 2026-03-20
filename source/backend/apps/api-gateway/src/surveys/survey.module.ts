import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICE_TOKENS } from '@app/common';
import { SurveyGatewayController } from './survey.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICE_TOKENS.SURVEY_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('SURVEY_SERVICE_HOST', 'localhost'),
            port: parseInt(config.get<string>('SURVEY_SERVICE_PORT', '3015'), 10),
          },
        }),
      },
    ]),
  ],
  controllers: [SurveyGatewayController],
  exports: [ClientsModule],
})
export class SurveyGatewayModule {}
