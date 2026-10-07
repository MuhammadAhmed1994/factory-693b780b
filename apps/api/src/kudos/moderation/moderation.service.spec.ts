import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('[AC-9] lead can hide a kudos item and receive its hidden state', async () => {
    const hiddenAt = new Date('2026-06-01T12:00:00.000Z');
    const update = jest.fn().mockImplementation(async ({ data }) => ({
      id: 'kudos-1',
      authorId: 'member-1',
      recipientId: 'member-2',
      message: 'Great work!',
      isHidden: data.isHidden,
      hiddenAt: data.hiddenAt,
      hiddenById: data.hiddenById,
      createdAt: new Date('2026-06-01T11:00:00.000Z'),
      updatedAt: hiddenAt,
    }));
    const prisma = {
      kudos: { update },
    } as unknown as PrismaService;
    const service = new ModerationService(prisma);
    jest.useFakeTimers().setSystemTime(hiddenAt);

    try {
      const result = await service.hideKudos('kudos-1', 'lead-1');

      expect(update).toHaveBeenCalledWith({
        where: { id: 'kudos-1' },
        data: {
          isHidden: true,
          hiddenAt,
          hiddenById: 'lead-1',
        },
      });
      expect(result).toMatchObject({
        id: 'kudos-1',
        isHidden: true,
        hiddenAt,
        hiddenById: 'lead-1',
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
