import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SignInDto } from './dto/sign-in.dto';
import { AuthService, SignInResult, SignInUser } from './auth.service';

export interface SignInResponse {
  session: SignInResult['session'];
  user: SignInUser;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => new BadRequestException(errors),
      }),
    )
    credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponse> {
    const result = await this.authService.signIn(credentials.email, credentials.password);
    response.setHeader(
      'Set-Cookie',
      `session=${encodeURIComponent(result.credential)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${result.session.expiresAt.toUTCString()}`,
    );
    return { session: result.session, user: result.user };
  }
}
