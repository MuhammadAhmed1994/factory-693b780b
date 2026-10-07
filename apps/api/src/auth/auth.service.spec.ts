import { randomBytes } from 'node:crypto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';

describe('AuthService', () => {
  const userRecord = {
    id: 'user-1',
    email: 'member@example.test',
    passwordHash: '',
    role: UserRole.MEMBER,
  };
  const sessionRecord = {
    id: 'session-1',
    expiresAt: new Date(Date.now() + 60_000),
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    session: { create: jest.fn() },
  } as unknown as PrismaService;
  let service: AuthService;
  let submittedPassword: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    submittedPassword = randomBytes(32).toString('hex');
    userRecord.passwordHash = await bcrypt.hash(submittedPassword, 4);
    service = new AuthService(prisma);
  });

  it('[AC-1] authenticates valid credentials and returns a persisted session and public user identity', async () => {
    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userRecord as never);
    jest.spyOn(prisma.session, 'create').mockResolvedValue(sessionRecord as never);

    const result = await service.signIn({
      email: 'member@example.test',
      password: submittedPassword,
    } satisfies SignInDto);

    expect(result.session).toEqual(sessionRecord);
    expect(result.user).toEqual({ id: userRecord.id, email: userRecord.email, role: UserRole.MEMBER });
    expect(result).not.toHaveProperty('passwordHash');
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: userRecord.id,
          tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
          expiresAt: expect.any(Date),
        }),
        select: { id: true, expiresAt: true },
      }),
    );
    const createdData = (prisma.session.create as jest.Mock).mock.calls[0][0].data;
    expect(createdData.tokenHash).not.toBe(result.credential);
  });
});
