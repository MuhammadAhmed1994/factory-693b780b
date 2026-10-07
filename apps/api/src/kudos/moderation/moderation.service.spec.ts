import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('[AC-9] allows a lead to hide a kudos item and reports the hidden state', async () => {
    const hiddenAt = new Date('2026-06-01T12:30:00.000Z');
    const hiddenItem = {
      id: 'kudos-1',
      authorId: 'member-1',
      recipientId: 'member-2',
      message: 'Great work!',
      isHidden: true,
      hiddenAt,
      hiddenById: 'lead-1',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      updatedAt: hiddenAt,
    };
    const prisma = {
      kudos: {
        findUnique: jest.fn().mockResolvedValue({ id: hiddenItem.id }),
        update: jest.fn().mockResolvedValue(hiddenItem),
      },
    };
    const service = new ModerationService(prisma as unknown as PrismaService);

    const result = await service.hideKudos(hiddenItem.id, 'lead-1');

    expect(prisma.kudos.update).toHaveBeenCalledWith({
      where: { id: hiddenItem.id },
      data: {
        isHidden: true,
        hiddenAt: expect.any(Date),
        hiddenById: 'lead-1',
      },
    });
    expect(result).toMatchObject({
      id: hiddenItem.id,
      isHidden: true,
      hiddenAt,
      hiddenById: 'lead-1',
    });
  });
});
