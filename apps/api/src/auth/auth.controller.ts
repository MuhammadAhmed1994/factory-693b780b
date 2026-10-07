import {
  ArgumentsHost,
  Body,
  Catch,
  Controller,
  ExceptionFilter,
  Post,
  Res,
  UnprocessableEntityException,
  UseFilters,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService, SignedInSession, SignedInUser } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

/** Public response shape for a successful sign-in. */
export interface SignInResponse {
  session: SignedInSession;
  user: SignedInUser;
}

/** Sign-in's endpoint contract uses 400 for DTO validation failures. */
@Catch(UnprocessableEntityException)
class SignInValidationFilter implements ExceptionFilter<UnprocessableEntityException> {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const body = exception.getResponse();
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? body.message
        : exception.message;
    response.status(400).json({ statusCode: 400, message, error: 'Bad Request' });
  }
}

@Controller('auth')
@UseFilters(SignInValidationFilter)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body() credentials: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponse> {
    const result = await this.authService.signIn(credentials);
    const maxAgeSeconds = Math.floor((result.session.expiresAt.getTime() - Date.now()) / 1000);
    response.setHeader(
      'Set-Cookie',
      `session=${result.credential}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
    );
    return { session: result.session, user: result.user };
  }
}
