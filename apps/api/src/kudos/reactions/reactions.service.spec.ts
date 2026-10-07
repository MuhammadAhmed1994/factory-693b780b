import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  const member = { id: 'member-1', email: 'member@example.test' };
  const kudos = {
    id: 'kudos-1',
    authorId: 'member-2',
    recipientId: 'member-3',
    message: 'Great work!',
    isHidden: false,
    hiddenAt: null,
    hiddenById: null,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  };
  const reaction = {
    id: 'reaction-1',
    userId: member.id,
    kudosId: kudos.id,
    emoji: '🎉',
    createdAt: new Date('2026-06-01T12:01:00.000Z'),
    updatedAt: new Date('2026-06-01T12:01:00.000Z'),
    user: member,
    kudos,
  };

  let prisma: {
    kudos: { findUnique: jest.Mock };
    reaction: { create: jest.Mock };
  };
  let service: ReactionsService;

  beforeEach(() => {
    prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue({ id: kudos.id }) },
      reaction: { create: jest.fn().mockResolvedValue(reaction) },
    };
    service = new ReactionsService(prisma as unknown as PrismaService);
  });

  it('[AC-7] records a member reaction associated with the correct member and kudos item', async () => {
    const result = await service.createReaction(member.id, kudos.id, '🎉');

    expect(result).toEqual(reaction);
    expect(result.user).toEqual(member);
    expect(result.kudos).toEqual(kudos);
    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { userId: member.id, kudosId: kudos.id, emoji: '🎉' },
      include: {
        user: { select: { id: true, email: true } },
        kudos: true,
      },
    });
  });

  it('returns not found when the kudos item does not exist', async () => {
    prisma.kudos.findUnique.mockResolvedValue(null);

    await expect(service.createReaction(member.id, 'missing-kudos', '🎉')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.reaction.create).not.toHaveBeenCalled();
  });

  it('does not silently allow a second reaction', async () => {
    const uniqueError = Object.assign(new Error('unique constraint'), { code: 'P2002' });
    prisma.reaction.create.mockRejectedValue(uniqueError);

    await expect(service.createReaction(member.id, kudos.id, '🎉')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
