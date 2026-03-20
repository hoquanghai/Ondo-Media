import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UserModule } from './user.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UserModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.USER_SERVICE_PORT ?? '3012', 10),
      },
    },
  );
  await app.listen();
  console.log(`User Service is running on TCP port ${process.env.USER_SERVICE_PORT ?? '3012'}`);
}
bootstrap();
