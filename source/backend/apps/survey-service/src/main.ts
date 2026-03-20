import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SurveyModule } from './survey.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    SurveyModule,
    {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3005 },
    },
  );
  await app.listen();
  console.log('Survey Service is running on port 3005');
}
bootstrap();
