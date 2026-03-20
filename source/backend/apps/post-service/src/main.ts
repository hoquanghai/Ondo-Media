import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { PostModule } from './post.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PostModule,
    {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3003 },
    },
  );
  await app.listen();
  console.log('Post Service is running on port 3003');
}
bootstrap();
