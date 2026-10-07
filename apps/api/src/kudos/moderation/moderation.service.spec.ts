import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('[AC-9] allows a team lead to hide kudos and reports the item as hidden', async () => {
    const hiddenAt = new Date('2026-06-01T12:00:00.000Z');
    const prisma = {
      kudos: {
        update: jest.fn().mockResolvedValue({
          id: 'kudos-1',
          authorId: 'author-1',
          recipientId: 'recipient-1',
          message: 'Great work',
          isHidden: true,
          hiddenAt,
          hiddenById: 'lead-1',
          createdAt: new Date('2026-06-01T11:00:00.000Z'),
          updatedAt: hiddenAt,
        }),
      },
    };
    const service = new ModerationService(prisma as unknown as PrismaService);

    const result = await service.hideKudos('kudos-1', 'lead-1');

    expect(prisma.kudos.update).toHaveBeenCalledWith({
      where: { id: 'kudos-1' },
      data: {
        isHidden: true,
        hiddenAt: expect.any(Date),
        hiddenById: 'lead-1',
      },
    });
    expect(result).toMatchObject({
      id: 'kudos-1',
      isHidden: true,
      hiddenAt,
      hiddenById: 'lead-1',
    });
  });
});
