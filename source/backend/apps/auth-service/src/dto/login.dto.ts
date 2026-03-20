import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsNumber()
  @IsNotEmpty()
  lastNumber: number;

  @IsString()
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
