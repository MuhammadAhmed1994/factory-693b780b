import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/session-auth.guard';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  it('[AC-9] allows a team lead to hide kudos and reports the hidden state', async () => {
    const hiddenKudos = {
      id: 'kudos-id',
      authorId: 'author-id',
      recipientId: 'recipient-id',
      message: 'A kind message',
      isHidden: true,
      hiddenAt: new Date('2025-01-02T00:00:00.000Z'),
      hiddenById: 'lead-id',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
    };
    const findUnique = jest.fn().mockResolvedValue({ id: hiddenKudos.id });
    const update = jest.fn().mockResolvedValue(hiddenKudos);
    const prisma = {
      kudos: { findUnique, update },
    } as unknown as PrismaService;
    const service = new ModerationService(prisma);
    const lead: AuthenticatedUser = {
      id: 'lead-id',
      email: 'lead@example.test',
      role: 'LEAD',
    };

    const result = await service.hideKudos(hiddenKudos.id, lead);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: hiddenKudos.id } });
    expect(update).toHaveBeenCalledWith({
      where: { id: hiddenKudos.id },
      data: expect.objectContaining({
        isHidden: true,
        hiddenAt: expect.any(Date),
        hiddenById: lead.id,
      }),
    });
    expect(result).toMatchObject({
      id: hiddenKudos.id,
      isHidden: true,
      hiddenById: lead.id,
      hiddenAt: expect.any(Date),
    });
  });
});
