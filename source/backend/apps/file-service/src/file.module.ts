import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule, FileRecord } from '@app/database';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { MinioService } from './minio.service';
import { ImageProcessorService } from './image-processor.service';
import { VideoProcessorService } from './video-processor.service';
import { FileValidatorService } from './file-validator.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    TypeOrmModule.forFeature([FileRecord]),
  ],
  controllers: [FileController],
  providers: [
    FileService,
    MinioService,
    ImageProcessorService,
    VideoProcessorService,
    FileValidatorService,
  ],
})
export class FileModule {}
