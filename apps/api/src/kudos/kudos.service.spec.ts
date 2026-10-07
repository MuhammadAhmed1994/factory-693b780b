import { PrismaService } from '../prisma/prisma.service';
import { KudosService } from './kudos.service';

describe('KudosService', () => {
  it('[AC-3] creates kudos with a 280-character message and recipient', async () => {
    const created = {
      id: 'kudos-1',
      authorId: 'author-1',
      recipientId: 'recipient-1',
      message: 'k'.repeat(280),
      isHidden: false,
      hiddenAt: null,
      hiddenById: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      recipient: { id: 'recipient-1', email: 'recipient@example.test' },
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'recipient-1' }) },
      kudos: { create: jest.fn().mockResolvedValue(created) },
    } as unknown as PrismaService;
    const service = new KudosService(prisma);

    const result = await service.createKudos('author-1', 'recipient-1', 'k'.repeat(280));

    expect(result.message).toHaveLength(280);
    expect(result.recipient).toEqual({ id: 'recipient-1', email: 'recipient@example.test' });
    expect(prisma.kudos.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { authorId: 'author-1', recipientId: 'recipient-1', message: 'k'.repeat(280) },
    }));
  });

  it('[AC-5] returns newest-first board pages with 20 items per page', async () => {
    const prisma = {
      kudos: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(21),
      },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    } as unknown as PrismaService;
    const service = new KudosService(prisma);

    const result = await service.listKudos(2);

    expect(result).toEqual({ items: [], page: 2, pageSize: 20, total: 21 });
    expect(prisma.kudos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
    }));
  });

  it('[AC-10] excludes hidden kudos from board results', async () => {
    const visibleItem = { id: 'visible', isHidden: false };
    const prisma = {
      kudos: {
        findMany: jest.fn().mockResolvedValue([visibleItem]),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    } as unknown as PrismaService;
    const service = new KudosService(prisma);

    const result = await service.listKudos();

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isHidden: false },
    }));
    expect(result.items).toEqual([visibleItem]);
  });
});
