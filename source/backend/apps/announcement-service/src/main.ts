import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AnnouncementModule } from './announcement.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AnnouncementModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.ANNOUNCEMENT_SERVICE_PORT ?? '3014', 10),
      },
    },
  );
  await app.listen();
  console.log(`Announcement Service is running on TCP port ${process.env.ANNOUNCEMENT_SERVICE_PORT ?? '3014'}`);
}
bootstrap();
