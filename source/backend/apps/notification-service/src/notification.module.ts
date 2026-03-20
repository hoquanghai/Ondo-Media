import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, Notification, PushSubscription, User } from '@app/database';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { EventSubscriber } from './event-subscriber.service';
import { WebPushService } from './web-push.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Notification, PushSubscription, User]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    EventSubscriber,
    WebPushService,
  ],
})
export class NotificationModule {}
