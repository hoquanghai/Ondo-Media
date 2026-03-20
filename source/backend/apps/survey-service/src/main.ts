import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SurveyModule } from './survey.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SurveyModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.SURVEY_SERVICE_PORT ?? '3015', 10),
      },
    },
  );
  await app.listen();
  console.log(`Survey Service is running on TCP port ${process.env.SURVEY_SERVICE_PORT ?? '3015'}`);
}
bootstrap();
