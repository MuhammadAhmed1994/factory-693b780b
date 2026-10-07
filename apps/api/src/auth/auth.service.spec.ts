import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

const makePrismaMock = (): {
  prisma: PrismaService;
  findUser: jest.Mock;
  createSession: jest.Mock;
} => {
  const findUser = jest.fn();
  const createSession = jest.fn();
  const prisma = {
    user: { findUnique: findUser },
    session: { create: createSession },
  } as unknown as PrismaService;
  return { prisma, findUser, createSession };
};

describe('AuthService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('[AC-1] signs in a valid user and returns an authenticated session', async () => {
    const { prisma, findUser, createSession } = makePrismaMock();
    const service = new AuthService(prisma);
    const suppliedSecret = randomBytes(24).toString('hex');
    const storedHash = createHash('sha256').update(randomBytes(24)).digest('hex');
    findUser.mockResolvedValue({
      id: 'user-id',
      email: 'member@example.test',
      role: UserRole.MEMBER,
      passwordHash: storedHash,
    });
    createSession.mockImplementation(async (args: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) => ({ id: 'session-id', expiresAt: args.data.expiresAt }));
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await service.signIn({
      email: 'member@example.test',
      password: suppliedSecret,
    });

    expect(result.session.id).toBe('session-id');
    expect(result.session.expiresAt).toBeInstanceOf(Date);
    expect(result.user).toEqual({
      id: 'user-id',
      email: 'member@example.test',
      role: UserRole.MEMBER,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(createSession).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-id',
        expiresAt: result.session.expiresAt,
        tokenHash: createHash('sha256').update(result.credential).digest('hex'),
      }),
      select: { id: true, expiresAt: true },
    });
    expect(result.credential).not.toBe(
      (createSession.mock.calls[0][0] as { data: { tokenHash: string } }).data.tokenHash,
    );
  });
});
