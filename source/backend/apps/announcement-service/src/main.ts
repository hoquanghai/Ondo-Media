import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AnnouncementModule } from './announcement.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AnnouncementModule,
    {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3004 },
    },
  );
  await app.listen();
  console.log('Announcement Service is running on port 3004');
}
bootstrap();
