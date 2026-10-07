import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  it('[AC-7] records and returns a reaction associated with its member and kudos item', async () => {
    const createdReaction = {
      id: 'reaction-1',
      userId: 'member-1',
      kudosId: 'kudos-1',
      emoji: '🎉',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      user: { id: 'member-1', email: 'member@example.test' },
      kudos: {
        id: 'kudos-1',
        authorId: 'author-1',
        recipientId: 'recipient-1',
        message: 'Great work',
        isHidden: false,
        hiddenAt: null,
        hiddenById: null,
        createdAt: new Date('2025-12-31T00:00:00.000Z'),
        updatedAt: new Date('2025-12-31T00:00:00.000Z'),
      },
    };
    const prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }) },
      reaction: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(createdReaction),
      },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    const result = await service.createReaction('kudos-1', 'member-1', '🎉');

    expect(result).toEqual(createdReaction);
    expect(result.user).toEqual({ id: 'member-1', email: 'member@example.test' });
    expect(result.kudos.id).toBe('kudos-1');
    expect(prisma.reaction.create).toHaveBeenCalledWith({
      data: { userId: 'member-1', kudosId: 'kudos-1', emoji: '🎉' },
      include: {
        user: { select: { id: true, email: true } },
        kudos: true,
      },
    });
  });

  it('returns not found when the kudos item does not exist', async () => {
    const prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue(null) },
      reaction: { findUnique: jest.fn(), create: jest.fn() },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    await expect(service.createReaction('missing', 'member-1', '🎉')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.reaction.create).not.toHaveBeenCalled();
  });

  it('returns conflict when the member already reacted', async () => {
    const prisma = {
      kudos: { findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }) },
      reaction: {
        findUnique: jest.fn().mockResolvedValue({ id: 'reaction-1' }),
        create: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new ReactionsService(prisma);

    await expect(service.createReaction('kudos-1', 'member-1', '🎉')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.reaction.create).not.toHaveBeenCalled();
  });
});
