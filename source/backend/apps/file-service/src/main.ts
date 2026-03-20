import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { FileModule } from './file.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    FileModule,
    {
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3007 },
    },
  );
  await app.listen();
  console.log('File service listening on TCP port 3007');
}
bootstrap();
