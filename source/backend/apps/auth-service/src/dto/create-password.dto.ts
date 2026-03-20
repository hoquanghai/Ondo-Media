import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
