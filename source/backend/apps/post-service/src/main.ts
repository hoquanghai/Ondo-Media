import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PostModule } from './post.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PostModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.POST_SERVICE_PORT ?? '3013', 10),
      },
    },
  );
  await app.listen();
  console.log(`Post Service is running on TCP port ${process.env.POST_SERVICE_PORT ?? '3013'}`);
}
bootstrap();
