import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FileModule } from './file.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    FileModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.FILE_SERVICE_PORT ?? '3017', 10),
      },
    },
  );
  await app.listen();
  console.log(`File service listening on TCP port ${process.env.FILE_SERVICE_PORT ?? '3017'}`);
}
bootstrap();
