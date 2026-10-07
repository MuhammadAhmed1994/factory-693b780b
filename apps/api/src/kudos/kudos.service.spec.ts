import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { KudosService } from './kudos.service';

describe('KudosService', () => {
  let prisma: {
    user: { findUnique: jest.Mock; findMany: jest.Mock };
    kudos: { create: jest.Mock; findMany: jest.Mock };
  };
  let service: KudosService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      kudos: { create: jest.fn(), findMany: jest.fn() },
    };
    service = new KudosService(prisma as unknown as PrismaService);
  });

  it('[AC-3] creates kudos for a valid recipient with a 280-character message', async () => {
    const dto: CreateKudosDto = { recipientId: 'recipient-1', message: 'x'.repeat(280) };
    const recipient = { id: 'recipient-1', email: 'member@example.test', role: 'MEMBER' };
    const created = {
      id: 'kudos-1',
      authorId: 'author-1',
      recipientId: dto.recipientId,
      message: dto.message,
      isHidden: false,
      hiddenAt: null,
      hiddenById: null,
      createdAt: new Date('2026-06-01T12:00:00Z'),
      updatedAt: new Date('2026-06-01T12:00:00Z'),
      recipient,
    };
    prisma.user.findUnique.mockResolvedValue({ id: recipient.id });
    prisma.kudos.create.mockResolvedValue(created);

    const result = await service.createKudos('author-1', dto);

    expect(prisma.kudos.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { authorId: 'author-1', recipientId: recipient.id, message: 'x'.repeat(280) },
    }));
    expect(result).toMatchObject({ message: 'x'.repeat(280), recipient });
  });

  it('[AC-5] returns twenty items per page in newest-first order', async () => {
    prisma.kudos.findMany.mockResolvedValue([]);

    const result = await service.listKudos(2);

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 20,
    }));
    expect(result).toMatchObject({ items: [], page: 2, pageSize: 20 });
  });

  it('[AC-10] excludes hidden kudos from board results', async () => {
    prisma.kudos.findMany.mockResolvedValue([]);

    const result = await service.listKudos(1);

    expect(prisma.kudos.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isHidden: false },
    }));
    expect(result.items).toEqual([]);
  });
});
