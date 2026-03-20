import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QueryPostsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'postDate'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
