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
    options: {
      host: '0.0.0.0',
      port: parseInt(process.env.NOTIFICATION_SERVICE_PORT ?? '3016', 10),
    },
  });

  // Configure Socket.IO adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS for WebSocket
  app.enableCors({ origin: '*', credentials: true });

  await app.startAllMicroservices();

  const wsPort = parseInt(process.env.NOTIFICATION_WS_PORT ?? '3026', 10);
  await app.listen(wsPort);
  console.log(`Notification service: TCP on ${process.env.NOTIFICATION_SERVICE_PORT ?? '3016'}, WebSocket on ${wsPort}`);
}
bootstrap();
