import { UserRole } from '@prisma/client';
import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    id: 'user-123',
    email: 'member@example.test',
    role: UserRole.MEMBER,
    passwordHash: 'stored-hash',
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn() },
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as unknown as PrismaService);
  });

  it('[AC-1] returns an authenticated session and public user identity on successful sign-in', async () => {
    const password = 'a valid password';
    user.passwordHash = await bcrypt.hash(password, 4);
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.session.create.mockImplementation(async ({ data }) => ({
      id: 'session-456',
      expiresAt: data.expiresAt,
    }));

    const result = await service.signIn({ email: user.email, password });

    expect(result.session.id).toBe('session-456');
    expect(result.session.token).toEqual(expect.any(String));
    expect(result.session.token).not.toBe('');
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: user.id,
        tokenHash: createHash('sha256').update(result.session.token).digest('hex'),
      }),
      select: { id: true, expiresAt: true },
    });
    expect(prisma.session.create.mock.calls[0][0].data.tokenHash).not.toBe(result.session.token);
    expect(result.user).toEqual({ id: user.id, email: user.email, role: UserRole.MEMBER });
    expect(result).not.toHaveProperty('user.passwordHash');
  });

  it('rejects unknown accounts with a generic unauthorized response', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.signIn({ email: 'missing@example.test', password: 'irrelevant' }),
    ).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' });
    expect(prisma.session.create).not.toHaveBeenCalled();
  });
});
