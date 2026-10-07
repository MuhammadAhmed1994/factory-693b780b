import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('[AC-9] lets a team lead hide a kudos item and reports its hidden state', async () => {
    const hiddenAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedKudos = {
      id: 'kudos-1',
      authorId: 'author-1',
      recipientId: 'recipient-1',
      message: 'Well done',
      isHidden: true,
      hiddenAt,
      hiddenById: 'lead-1',
      createdAt: new Date('2025-12-31T00:00:00.000Z'),
      updatedAt: hiddenAt,
      recipient: { id: 'recipient-1', email: 'recipient@example.test' },
    };
    const prisma = {
      kudos: {
        findUnique: jest.fn().mockResolvedValue({ id: 'kudos-1' }),
        update: jest.fn().mockResolvedValue(updatedKudos),
      },
    } as unknown as PrismaService;
    const service = new ModerationService(prisma);

    const result = await service.hideKudos('kudos-1', 'lead-1');

    expect(result).toEqual(updatedKudos);
    expect(result.isHidden).toBe(true);
    expect(result.hiddenAt).toBeInstanceOf(Date);
    expect(result.hiddenById).toBe('lead-1');
    expect(prisma.kudos.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'kudos-1' },
      data: expect.objectContaining({
        isHidden: true,
        hiddenAt: expect.any(Date),
        hiddenById: 'lead-1',
      }),
    }));
  });
});
