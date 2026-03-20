import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FileService } from './file.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @MessagePattern(MESSAGE_PATTERNS.FILE_UPLOAD)
  async upload(
    @Payload()
    data: {
      userId: number;
      originalName: string;
      mimeType: string;
      buffer: string;
    },
  ) {
    return this.fileService.upload(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.FILE_GET_URL)
  async getUrl(@Payload() data: { fileId: string }) {
    return this.fileService.getUrl(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.FILE_DELETE)
  async delete(@Payload() data: { fileId: string; userId: number }) {
    return this.fileService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.FILE_GET_INFO)
  async getInfo(@Payload() data: { fileId: string }) {
    return this.fileService.getInfo(data);
  }
}
