import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class LoginMicrosoftDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  redirectUri?: string;
}
