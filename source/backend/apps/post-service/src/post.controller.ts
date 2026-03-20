import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PostService } from './post.service';
import { MESSAGE_PATTERNS } from '@app/common';

@Controller()
export class PostController {
  constructor(private readonly postService: PostService) {}

  // ─── Post CRUD ───

  @MessagePattern(MESSAGE_PATTERNS.POST_CREATE)
  async create(@Payload() data: any) {
    return this.postService.create(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_FIND_ALL)
  async findAll(@Payload() data: any) {
    return this.postService.findAll(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_FIND_BY_ID)
  async findById(@Payload() data: any) {
    return this.postService.findById(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_UPDATE)
  async update(@Payload() data: any) {
    return this.postService.update(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_DELETE)
  async delete(@Payload() data: any) {
    return this.postService.delete(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_GET_DATE_COUNTS)
  async getDateCounts(@Payload() data: any) {
    return this.postService.getDateCounts(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_FIND_BY_USER_ID)
  async findByUserId(@Payload() data: any) {
    return this.postService.findByUserId(data);
  }

  // ─── Likes ───

  @MessagePattern(MESSAGE_PATTERNS.POST_LIKE)
  async like(@Payload() data: any) {
    return this.postService.like(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_UNLIKE)
  async unlike(@Payload() data: any) {
    return this.postService.unlike(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_GET_LIKES)
  async getLikes(@Payload() data: any) {
    return this.postService.getLikes(data);
  }

  // ─── Comments ───

  @MessagePattern(MESSAGE_PATTERNS.POST_CREATE_COMMENT)
  async createComment(@Payload() data: any) {
    return this.postService.createComment(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_FIND_COMMENTS)
  async findComments(@Payload() data: any) {
    return this.postService.findComments(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_UPDATE_COMMENT)
  async updateComment(@Payload() data: any) {
    return this.postService.updateComment(data);
  }

  @MessagePattern(MESSAGE_PATTERNS.POST_DELETE_COMMENT)
  async deleteComment(@Payload() data: any) {
    return this.postService.deleteComment(data);
  }

  // ─── Files ───

  @MessagePattern(MESSAGE_PATTERNS.POST_CREATE_FILES)
  async createFiles(@Payload() data: any) {
    return this.postService.createFiles(data);
  }
}
