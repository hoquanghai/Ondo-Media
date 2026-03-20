import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
} from '@app/common';

@Controller('files')
export class FileGatewayController {
  constructor(
    @Inject(SERVICE_TOKENS.FILE_SERVICE)
    private readonly client: ClientProxy,
  ) {}

  // ─── Upload File ───

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.FILE_UPLOAD, {
        userId: user.shainBangou,
        originalName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer.toString('base64'),
      }),
    );
  }

  // ─── Get File Signed URL ───

  @Get(':id')
  async getSignedUrl(@Param('id') fileId: string) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.FILE_GET_URL, { fileId }),
    );
  }

  // ─── Get File Info ───

  @Get(':id/info')
  async getInfo(@Param('id') fileId: string) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.FILE_GET_INFO, { fileId }),
    );
  }

  // ─── Delete File ───

  @Delete(':id')
  async delete(
    @Param('id') fileId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.client.send(MESSAGE_PATTERNS.FILE_DELETE, {
        fileId,
        userId: user.shainBangou,
      }),
    );
  }
}
