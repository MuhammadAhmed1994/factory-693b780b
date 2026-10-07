import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService sign-in', () => {
  it('[AC-1] returns an authenticated session for valid credentials', async () => {
    const password = 'valid-password';
    const passwordHash = await bcrypt.hash(password, 4);
    const createSession = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'session-1', expiresAt: data.expiresAt }),
    );
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'member@example.test',
          passwordHash,
          role: UserRole.MEMBER,
        }),
      },
      session: { create: createSession },
    } as unknown as PrismaService;
    const service = new AuthService(prisma);

    const result = await service.signIn({
      email: 'member@example.test',
      password,
    });

    expect(result).toMatchObject({
      session: { id: 'session-1' },
      user: { id: 'user-1', email: 'member@example.test', role: UserRole.MEMBER },
    });
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(result.credential).toEqual(expect.any(String));
    const persisted = createSession.mock.calls[0][0].data;
    expect(persisted.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.tokenHash).not.toBe(result.credential);
    expect(persisted.userId).toBe('user-1');
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});
