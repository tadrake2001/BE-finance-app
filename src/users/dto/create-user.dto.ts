import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  avatar: string;
}

export class RegisterUserDto {
  @IsNotEmpty({ message: 'Name không được để trống', })
  name: string;

  @IsEmail({}, { message: 'Email không đúng định dạng', })
  @IsNotEmpty({ message: 'Email không được để trống', })
  email: string;

  @IsNotEmpty({ message: 'Password không được để trống', })
  password: string;

  @IsOptional()
  googleId?: string;

  @IsOptional()
  avatar?: string;
}
