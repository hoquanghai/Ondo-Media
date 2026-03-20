import {
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Patch,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
} from '@app/common';

@Controller('comments')
export class CommentController {
  constructor(
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
  ) {}

  @Patch(':id')
  async updateComment(
    @Param('id') commentId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_UPDATE_COMMENT, {
        commentId,
        userId: user.shainBangou,
        content: body.content,
      }),
    );
  }

  @Delete(':id')
  async deleteComment(
    @Param('id') commentId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_DELETE_COMMENT, {
        commentId,
        userId: user.shainBangou,
      }),
    );
  }
}
