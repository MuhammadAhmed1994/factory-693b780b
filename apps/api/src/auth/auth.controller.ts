import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, CreatedSignInSession, SignInResult } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

const SESSION_COOKIE_NAME = 'session';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body() credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResult> {
    const created: CreatedSignInSession = await this.authService.signIn(credentials);
    response.cookie(SESSION_COOKIE_NAME, created.credential, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      expires: created.session.expiresAt,
    });
    return { session: created.session, user: created.user };
  }
}
