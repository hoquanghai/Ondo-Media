import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.TCP,
      options: { host: 'localhost', port: 3002 },
    },
  );
  await app.listen();
  console.log('User Service is running on port 3002');
}
bootstrap();
