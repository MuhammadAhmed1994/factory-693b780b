import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  const existingKudos = { id: 'kudos-1' };
  const hiddenKudos = {
    id: 'kudos-1',
    authorId: 'member-1',
    recipientId: 'member-2',
    message: 'Great work!',
    isHidden: true,
    hiddenAt: new Date('2026-06-01T12:00:00.000Z'),
    hiddenById: 'lead-1',
    createdAt: new Date('2026-06-01T11:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
  };

  let prisma: {
    kudos: { findUnique: jest.Mock; update: jest.Mock };
  };
  let service: ModerationService;

  beforeEach(() => {
    prisma = {
      kudos: {
        findUnique: jest.fn().mockResolvedValue(existingKudos),
        update: jest.fn().mockResolvedValue(hiddenKudos),
      },
    };
    service = new ModerationService(prisma as unknown as PrismaService);
  });

  it('[AC-9] allows a team lead to hide kudos and reports the hidden state', async () => {
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
      hiddenById: 'lead-1',
    });
    expect(result.hiddenAt).toBeInstanceOf(Date);
  });
});
