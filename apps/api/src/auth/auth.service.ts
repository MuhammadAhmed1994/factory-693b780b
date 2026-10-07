import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignInDto } from './dto/sign-in.dto';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthenticatedIdentity {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedSession {
  id: string;
  expiresAt: Date;
}

export interface SignInResult {
  session: AuthenticatedSession;
  user: AuthenticatedIdentity;
}

export interface CreatedSignInSession extends SignInResult {
  credential: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async signIn(credentials: SignInDto): Promise<CreatedSignInSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      select: { id: true, email: true, passwordHash: true, role: true },
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
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
      credential,
      session,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
