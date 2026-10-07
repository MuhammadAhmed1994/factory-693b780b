import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';

/** Public user identity returned by sign-in; it intentionally has no password fields. */
export interface SignedInUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Persisted session information safe to include in the sign-in response. */
export interface SignedInSession {
  id: string;
  expiresAt: Date;
}

/** Internal sign-in result including the one-time credential used to set the browser cookie. */
export interface SignInResult {
  session: SignedInSession;
  user: SignedInUser;
  credential: string;
}

@Injectable()
export class AuthService {
  private readonly sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;

  constructor(private readonly prisma: PrismaService) {}

  async signIn(credentials: SignInDto): Promise<SignInResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const credential = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(credential).digest('hex');
    const expiresAt = new Date(Date.now() + this.sessionLifetimeMs);
    const session = await this.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
      select: { id: true, expiresAt: true },
    });

    return {
      session,
      user: { id: user.id, email: user.email, role: user.role },
      credential,
    };
  }
}
