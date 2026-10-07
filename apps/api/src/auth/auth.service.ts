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

export interface SessionSummary {
  id: string;
  expiresAt: Date;
}

/** Public sign-in response data and the one-time credential used to issue its cookie. */
export interface SignInResult {
  session: SessionSummary;
  user: SessionIdentity;
  credential: string;
}

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

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
