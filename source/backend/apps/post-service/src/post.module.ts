import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, Post, PostFile, Like, Comment } from '@app/database';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { TimelineCacheService } from './timeline-cache.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Post, PostFile, Like, Comment]),
  ],
  controllers: [PostController],
  providers: [PostService, TimelineCacheService, EventPublisher],
})
export class PostModule {}
