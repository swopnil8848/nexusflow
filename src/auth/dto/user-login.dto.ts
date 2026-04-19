import { IsString, MinLength } from 'class-validator';

export class UserLoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
