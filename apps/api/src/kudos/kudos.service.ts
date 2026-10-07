import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const KUDOS_PAGE_SIZE = 20;

export type KudosWithRecipient = Prisma.KudosGetPayload<{
  include: { recipient: { select: { id: true; email: true } } };
}>;

export interface KudosPage {
  items: KudosWithRecipient[];
  page: number;
  pageSize: number;
  total: number;
}

export type MemberDirectoryEntry = Pick<User, 'id' | 'email'>;

@Injectable()
export class KudosService {
  constructor(private readonly prisma: PrismaService) {}

  async createKudos(
    authorId: string,
    recipientId: string,
    message: string,
  ): Promise<KudosWithRecipient> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('The selected recipient does not exist');
    }

    return this.prisma.kudos.create({
      data: { authorId, recipientId, message },
      include: { recipient: { select: { id: true, email: true } } },
    });
  }

  async listKudos(page: number = 1): Promise<KudosPage> {
    const where: Prisma.KudosWhereInput = { isHidden: false };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.kudos.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * KUDOS_PAGE_SIZE,
        take: KUDOS_PAGE_SIZE,
        include: { recipient: { select: { id: true, email: true } } },
      }),
      this.prisma.kudos.count({ where }),
    ]);
    return { items, page, pageSize: KUDOS_PAGE_SIZE, total };
  }

  async listMembers(): Promise<MemberDirectoryEntry[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}
