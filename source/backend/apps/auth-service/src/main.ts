import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: parseInt(process.env.AUTH_SERVICE_PORT ?? '3011', 10),
      },
    },
  );
  await app.listen();
  console.log(`Auth Service is running on TCP port ${process.env.AUTH_SERVICE_PORT ?? '3011'}`);
}
bootstrap();
