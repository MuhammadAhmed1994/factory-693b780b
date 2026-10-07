import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosService, KUDOS_PAGE_SIZE } from './kudos.service';

describe('KudosService', () => {
  it('[AC-3] creates kudos with recipient and a message up to 280 characters', async () => {
    const recipient = { id: 'recipient-id', email: 'colleague@example.test' };
    const created = {
      id: 'kudos-id',
      authorId: 'author-id',
      recipientId: recipient.id,
      message: 'k'.repeat(280),
      isHidden: false,
      hiddenAt: null,
      hiddenById: null,
      createdAt: new Date('2025-01-02T00:00:00.000Z'),
      updatedAt: new Date('2025-01-02T00:00:00.000Z'),
      recipient,
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: recipient.id }) },
      kudos: { create: jest.fn().mockResolvedValue(created) },
    } as unknown as PrismaService;
    const service = new KudosService(prisma);
    const dto: CreateKudosDto = { recipientId: recipient.id, message: 'k'.repeat(280) };

    const result = await service.createKudos(dto, {
      id: 'author-id',
      email: 'author@example.test',
      role: 'MEMBER',
    });

    expect(prisma.kudos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { authorId: 'author-id', recipientId: recipient.id, message: 'k'.repeat(280) },
        include: { recipient: { select: { id: true, email: true } } },
      }),
    );
    expect(result).toMatchObject({ message: 'k'.repeat(280), recipient });
  });

  it('[AC-5] returns each page newest-first with 20 items', async () => {
    const items = Array.from({ length: KUDOS_PAGE_SIZE }, (_, index) => ({
      id: `item-${index}`,
      createdAt: new Date(2025, 0, KUDOS_PAGE_SIZE - index),
    }));
    const prisma = {
      kudos: { findMany: jest.fn().mockResolvedValue(items) },
    } as unknown as PrismaService;
    const service = new KudosService(prisma);

    const result = await service.listKudos(2);

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      }),
    );
    expect(result).toMatchObject({ items, page: 2, pageSize: 20 });
    expect(result.items).toHaveLength(20);
  });

  it('[AC-10] excludes hidden kudos from board results', async () => {
    const visibleItem = { id: 'visible', isHidden: false };
    const prisma = {
      kudos: { findMany: jest.fn().mockResolvedValue([visibleItem]) },
    } as unknown as PrismaService;
    const service = new KudosService(prisma);

    const result = await service.listKudos();

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isHidden: false } }),
    );
    expect(result.items).toEqual([visibleItem]);
    expect(result.items.some((item) => item.isHidden)).toBe(false);
  });
});
