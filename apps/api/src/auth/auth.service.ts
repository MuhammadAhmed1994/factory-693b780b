import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export interface SignInUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface SignInSession {
  id: string;
  expiresAt: Date;
}

/** Internal service result. The credential is sent only as an HttpOnly cookie by the controller. */
export interface SignInResult {
  session: SignInSession;
  user: SignInUser;
  credential: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(email: string, password: string): Promise<SignInResult> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const credential = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(credential).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
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
