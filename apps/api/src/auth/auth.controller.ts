import { Controller, Post, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { SignInDto } from './dto/sign-in.dto';
import { AuthService, SessionUserIdentity } from './auth.service';

export interface SignInResponse {
  session: { id: string; expiresAt: Date };
  user: SessionUserIdentity;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body() credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponse> {
    const result = await this.authService.signIn(credentials);
    const maxAge = Math.max(0, Math.floor((result.session.expiresAt.getTime() - Date.now()) / 1000));
    response.setHeader(
      'Set-Cookie',
      `session=${encodeURIComponent(result.session.credential)}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=${maxAge}`,
    );

    return {
      session: { id: result.session.id, expiresAt: result.session.expiresAt },
      user: result.user,
    };
  }
}
