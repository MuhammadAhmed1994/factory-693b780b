import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** Required credentials for an existing account. */
export class SignInDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
