import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosService } from './kudos.service';

describe('KudosService', () => {
  const recipient = { id: 'member-2', email: 'recipient@example.test' };
  const created = {
    id: 'kudos-1',
    authorId: 'member-1',
    recipientId: recipient.id,
    message: 'Great work!',
    isHidden: false,
    hiddenAt: null,
    hiddenById: null,
    createdAt: new Date('2026-06-01T12:00:00.000Z'),
    updatedAt: new Date('2026-06-01T12:00:00.000Z'),
    recipient,
  };

  let prisma: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    kudos: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: KudosService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(recipient),
        findMany: jest.fn().mockResolvedValue([recipient]),
      },
      kudos: {
        create: jest.fn().mockResolvedValue(created),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    };
    service = new KudosService(prisma as unknown as PrismaService);
  });

  it('[AC-3] creates a kudos item with its recipient and message', async () => {
    const input: CreateKudosDto = { recipientId: recipient.id, message: 'Great work!' };

    const result = await service.createKudos('member-1', input);

    expect(result).toMatchObject({ message: 'Great work!', recipient });
    expect(prisma.kudos.create).toHaveBeenCalledWith({
      data: { authorId: 'member-1', recipientId: recipient.id, message: 'Great work!' },
      include: { recipient: { select: { id: true, email: true } } },
    });
  });

  it('[AC-5] returns a newest-first board page of twenty items', async () => {
    await service.listKudos(2);

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isHidden: false },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
    expect(prisma.kudos.count).toHaveBeenCalledWith({ where: { isHidden: false } });
  });

  it('[AC-10] omits hidden kudos from board results', async () => {
    prisma.kudos.findMany.mockResolvedValue([]);

    const result = await service.listKudos();

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isHidden: false } }),
    );
    expect(result.items).toEqual([]);
  });
});
