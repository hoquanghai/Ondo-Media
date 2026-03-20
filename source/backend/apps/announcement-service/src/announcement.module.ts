import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, Announcement, AnnouncementReadStatus } from '@app/database';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Announcement, AnnouncementReadStatus]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, EventPublisher],
})
export class AnnouncementModule {}
