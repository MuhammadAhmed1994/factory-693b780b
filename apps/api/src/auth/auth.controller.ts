import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, SignInResult } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async signIn(
    @Body() credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResult> {
    const result = await this.authService.signIn(credentials);
    response.cookie('session', result.session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: result.session.expiresAt,
      path: '/',
    });
    return result;
  }
}
