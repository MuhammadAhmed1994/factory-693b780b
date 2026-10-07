import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  it('[AC-7] records and returns a member reaction associated with its kudos item', async () => {
    const member = { id: 'member-id', email: 'member@example.test', role: 'MEMBER' as const };
    const kudos = {
      id: 'kudos-id',
      authorId: 'author-id',
      recipientId: 'recipient-id',
      message: 'Great work',
      isHidden: false,
      hiddenAt: null,
      hiddenById: null,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    };
    const reaction = {
      id: 'reaction-id',
      userId: member.id,
      kudosId: kudos.id,
      emoji: '🎉',
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      user: { id: member.id, email: member.email },
      kudos,
    };
    const prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue({ id: kudos.id }) },
      reaction: { create: jest.fn().mockResolvedValue(reaction) },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    const result = await service.createReaction(kudos.id, { emoji: '🎉' }, member);

    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { userId: member.id, kudosId: kudos.id, emoji: '🎉' },
      include: {
        user: { select: { id: true, email: true } },
        kudos: true,
      },
    });
    expect(result).toEqual(reaction);
    expect(result.user).toEqual({ id: member.id, email: member.email });
    expect(result.kudos).toEqual(kudos);
  });

  it('returns not found when the requested kudos item does not exist', async () => {
    const prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue(null) },
      reaction: { create: jest.fn() },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    await expect(
      service.createReaction('missing-id', { emoji: '👍' }, {
        id: 'member-id',
        email: 'member@example.test',
        role: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.create).not.toHaveBeenCalled();
  });
});
