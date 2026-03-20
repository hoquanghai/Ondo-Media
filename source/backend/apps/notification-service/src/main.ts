import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  // Create the HTTP application (for WebSocket)
  const app = await NestFactory.create(NotificationModule);

  // Also connect as TCP microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 3006 },
  });

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS for WebSocket
  app.enableCors({ origin: '*', credentials: true });

  await app.startAllMicroservices();
  await app.listen(3016);
  console.log('Notification service: TCP on 3006, WebSocket on 3016');
}
bootstrap();
