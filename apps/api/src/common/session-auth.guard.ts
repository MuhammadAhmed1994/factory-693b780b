import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** The public identity attached to a request after a session has been authenticated. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Express request enriched with the authenticated user's public identity. */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const SESSION_COOKIE_NAME = 'session';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const credential = this.readCredential(request);
    if (!credential) {
      throw new UnauthorizedException('A valid session is required');
    }

    const tokenHash = createHash('sha256').update(credential).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('A valid session is required');
    }

    request.user = session.user;
    return true;
  }

  private readCredential(request: Request): string | null {
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const pair = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
      if (pair) {
        try {
          const value = decodeURIComponent(pair.slice(SESSION_COOKIE_NAME.length + 1));
          return value || null;
        } catch {
          return null;
        }
      }
    }

    const authorization = request.headers.authorization;
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i);
    return bearer?.[1]?.trim() || null;
  }
}
