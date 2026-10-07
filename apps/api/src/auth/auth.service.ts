import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';

export interface AuthenticatedSession {
  id: string;
  /** Credential returned internally for setting the HttpOnly session cookie. */
  credential: string;
  expiresAt: Date;
}

export interface SessionUserIdentity {
  id: string;
  email: string;
  role: UserRole;
}

export interface SignInResult {
  session: AuthenticatedSession;
  user: SessionUserIdentity;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(credentials: SignInDto): Promise<SignInResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    const validPassword = user
      ? await bcrypt.compare(credentials.password, user.passwordHash)
      : false;
    if (!user || !validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const credential = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(credential).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await this.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
      select: { id: true, expiresAt: true },
    });

    return {
      session: { id: session.id, credential, expiresAt: session.expiresAt },
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
