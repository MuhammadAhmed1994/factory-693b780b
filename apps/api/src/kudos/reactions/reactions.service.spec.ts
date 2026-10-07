import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  let prisma: {
    kudos: { findUnique: jest.Mock };
    reaction: { create: jest.Mock };
  };
  let service: ReactionsService;

  beforeEach(() => {
    prisma = {
      kudos: { findUnique: jest.fn() },
      reaction: { create: jest.fn() },
    };
    service = new ReactionsService(prisma as unknown as PrismaService);
  });

  it('[AC-7] records and returns the reaction with its member and kudos item associations', async () => {
    const member = { id: 'member-1', email: 'member@example.test', role: 'MEMBER' };
    const kudos = {
      id: 'kudos-1',
      authorId: 'author-1',
      recipientId: 'recipient-1',
      message: 'Great work!',
      isHidden: false,
      hiddenAt: null,
      hiddenById: null,
      createdAt: new Date('2026-06-01T12:00:00Z'),
      updatedAt: new Date('2026-06-01T12:00:00Z'),
    };
    const recorded = {
      id: 'reaction-1',
      userId: member.id,
      kudosId: kudos.id,
      emoji: '🎉',
      createdAt: new Date('2026-06-01T12:01:00Z'),
      updatedAt: new Date('2026-06-01T12:01:00Z'),
      user: member,
      kudos,
    };
    prisma.kudos.findUnique.mockResolvedValue({ id: kudos.id });
    prisma.reaction.create.mockResolvedValue(recorded);

    const result = await service.createReaction(member.id, kudos.id, { emoji: '🎉' });

    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { userId: member.id, kudosId: kudos.id, emoji: '🎉' },
      include: {
        user: { select: { id: true, email: true, role: true } },
        kudos: true,
      },
    });
    expect(result).toMatchObject({ user: member, kudos, userId: member.id, kudosId: kudos.id });
  });

  it('returns not found if the requested kudos item does not exist', async () => {
    prisma.kudos.findUnique.mockResolvedValue(null);

    await expect(service.createReaction('member-1', 'missing-kudos', { emoji: '🎉' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.create).not.toHaveBeenCalled();
  });

  it('returns conflict when the composite reaction uniqueness constraint is violated', async () => {
    prisma.kudos.findUnique.mockResolvedValue({ id: 'kudos-1' });
    prisma.reaction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['userId', 'kudosId'] },
      }),
    );

    await expect(service.createReaction('member-1', 'kudos-1', { emoji: '🎉' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
