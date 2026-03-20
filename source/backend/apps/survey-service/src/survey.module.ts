import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, Survey, SurveyQuestion, SurveyResponse } from '@app/database';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { EventPublisher } from './event-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([Survey, SurveyQuestion, SurveyResponse]),
  ],
  controllers: [SurveyController],
  providers: [SurveyService, EventPublisher],
})
export class SurveyModule {}
