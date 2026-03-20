import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  CurrentUser,
  MESSAGE_PATTERNS,
  SERVICE_TOKENS,
} from '@app/common';

@Controller('posts')
export class PostController {
  constructor(
    @Inject(SERVICE_TOKENS.POST_SERVICE)
    private readonly postClient: ClientProxy,
  ) {}

  // ─── Timeline / List ───

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('date') date?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_ALL, {
        date,
        userId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
        sortBy,
        sortOrder,
        currentUserId: user?.shainBangou,
      }),
    );
  }

  // ─── Date Counts (must be before :id route) ───

  @Get('dates')
  async getDateCounts(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
    @Query('userId') userId?: string,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_GET_DATE_COUNTS, {
        startDate,
        endDate,
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        userId,
      }),
    );
  }

  // ─── Single Post ───

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_BY_ID, {
        id,
        currentUserId: user?.shainBangou,
      }),
    );
  }

  // ─── Create Post ───

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body()
    body: {
      content: string;
      postDate: string;
      title?: string;
      attachments?: string[];
    },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_CREATE, {
        userId: user.shainBangou,
        content: body.content,
        postDate: body.postDate,
        title: body.title,
        attachments: body.attachments,
      }),
    );
  }

  // ─── Update Post ───

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      content?: string;
      title?: string;
      postDate?: string;
    },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_UPDATE, {
        id,
        userId: user.shainBangou,
        ...body,
      }),
    );
  }

  // ─── Delete Post ───

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_DELETE, {
        id,
        userId: user.shainBangou,
      }),
    );
  }

  // ─── Like ───

  @Post(':id/like')
  async like(
    @Param('id') postId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_LIKE, {
        postId,
        userId: user.shainBangou,
      }),
    );
  }

  @Delete(':id/like')
  async unlike(
    @Param('id') postId: string,
    @CurrentUser() user: any,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_UNLIKE, {
        postId,
        userId: user.shainBangou,
      }),
    );
  }

  @Get(':id/likes')
  async getLikes(@Param('id') postId: string) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_GET_LIKES, { postId }),
    );
  }

  // ─── Comments ───

  @Get(':id/comments')
  async getComments(
    @Param('id') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_FIND_COMMENTS, {
        postId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      }),
    );
  }

  @Post(':id/comments')
  async createComment(
    @Param('id') postId: string,
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    return firstValueFrom(
      this.postClient.send(MESSAGE_PATTERNS.POST_CREATE_COMMENT, {
        postId,
        userId: user.shainBangou,
        content: body.content,
      }),
    );
  }
}
