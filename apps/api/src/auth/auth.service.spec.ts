import { createHash } from 'node:crypto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn() },
  } as unknown as PrismaService;
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma);
  });

  it('[AC-1] successful sign-in returns an authenticated session', async () => {
    const user = {
      id: 'user-1',
      email: 'member@example.test',
      passwordHash: 'stored-hash',
      role: UserRole.MEMBER,
    };
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(user as never);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jest.spyOn(prisma.session, 'create').mockResolvedValue({
      id: 'session-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as never);

    const result = await service.signIn(user.email, 'correct-password');

    expect(result.session.id).toBe('session-1');
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.user).toEqual({ id: user.id, email: user.email, role: user.role });
    expect(result.credential).toBeTruthy();
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        tokenHash: createHash('sha256').update(result.credential).digest('hex'),
      }),
      select: { id: true, expiresAt: true },
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
