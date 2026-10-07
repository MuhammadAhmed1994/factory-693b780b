import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('AuthService', () => {
  const findUser = jest.fn();
  const createSession = jest.fn();
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService({
      user: { findUnique: findUser },
      session: { create: createSession },
    } as unknown as PrismaService);
  });

  it('[AC-1] authenticates valid credentials and returns an authenticated session', async () => {
    const password = randomBytes(16).toString('hex');
    const user = {
      id: 'user-id',
      email: 'member@example.test',
      passwordHash: randomBytes(32).toString('hex'),
      role: UserRole.MEMBER,
    };
    const savedSession = { id: 'session-id', expiresAt: new Date(Date.now() + 60_000) };
    findUser.mockResolvedValue(user);
    createSession.mockResolvedValue(savedSession);
    const compare = bcrypt.compare as jest.Mock;
    compare.mockResolvedValue(true);

    const result = await service.signIn({ email: user.email, password } satisfies SignInDto);
    const persistedData = createSession.mock.calls[0][0].data;

    expect(result).toEqual({
      session: { id: savedSession.id, credential: expect.any(String), expiresAt: savedSession.expiresAt },
      user: { id: user.id, email: user.email, role: UserRole.MEMBER },
    });
    expect(compare).toHaveBeenCalledWith(password, user.passwordHash);
    expect(persistedData.userId).toBe(user.id);
    expect(persistedData.tokenHash).toBe(createHash('sha256').update(result.session.credential).digest('hex'));
    expect(persistedData.tokenHash).not.toBe(result.session.credential);
    expect(persistedData.expiresAt).toBeInstanceOf(Date);
    expect(result).not.toHaveProperty('user.passwordHash');
  });
});
