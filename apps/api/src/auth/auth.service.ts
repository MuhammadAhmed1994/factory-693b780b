import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';

export interface SessionIdentity {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedSession {
  id: string;
  token: string;
  expiresAt: Date;
}

export interface SignInResult {
  session: AuthenticatedSession;
  user: SessionIdentity;
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(credentials: SignInDto): Promise<SignInResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, role: true, passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    const persistedSession = await this.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
      select: { id: true, expiresAt: true },
    });

    return {
      session: { id: persistedSession.id, token, expiresAt: persistedSession.expiresAt },
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
