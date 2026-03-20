import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '@app/common';

export class QueryUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsIn(['createdAt', 'displayName', 'department', 'username'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
