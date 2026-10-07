import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService, SessionIdentity, SessionSummary } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

export interface SignInResponse {
  session: SessionSummary;
  user: SessionIdentity;
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
    const remainingSeconds = Math.max(
      0,
      Math.floor((result.session.expiresAt.getTime() - Date.now()) / 1000),
    );
    response.setHeader(
      'Set-Cookie',
      `session=${encodeURIComponent(result.credential)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${remainingSeconds}`,
    );
    return { session: result.session, user: result.user };
  }
}
