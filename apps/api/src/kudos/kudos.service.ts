import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

const BOARD_PAGE_SIZE = 20;

/** A kudos response with the public recipient identity. */
export type CreatedKudos = Prisma.KudosGetPayload<{
  include: { recipient: { select: { id: true; email: true } } };
}>;

/** A kudos board row with the author and recipient display identities. */
export type KudosBoardItem = Prisma.KudosGetPayload<{
  include: {
    recipient: { select: { id: true; email: true } };
    author: { select: { id: true; email: true } };
    reactions: true;
  };
}>;

/** Public team-member identity exposed to the recipient selector. */
export interface TeamMemberDirectoryEntry {
  id: string;
  email: string;
}

/** Metadata and rows for one page of the visible kudos board. */
export interface KudosBoardPage {
  items: KudosBoardItem[];
  page: number;
  pageSize: number;
  totalItems: number;
}

@Injectable()
export class KudosService {
  constructor(private readonly prisma: PrismaService) {}

  async createKudos(authorId: string, input: CreateKudosDto): Promise<CreatedKudos> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('The selected recipient does not exist');
    }

    return this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: recipient.id,
        message: input.message,
      },
      include: { recipient: { select: { id: true, email: true } } },
    });
  }

  async listKudos(page: number = 1): Promise<KudosBoardPage> {
    const safePage = page;
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.kudos.findMany({
        where: { isHidden: false },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (safePage - 1) * BOARD_PAGE_SIZE,
        take: BOARD_PAGE_SIZE,
        include: {
          recipient: { select: { id: true, email: true } },
          author: { select: { id: true, email: true } },
          reactions: true,
        },
      }),
      this.prisma.kudos.count({ where: { isHidden: false } }),
    ]);

    return { items, page: safePage, pageSize: BOARD_PAGE_SIZE, totalItems };
  }

  async listMembers(): Promise<TeamMemberDirectoryEntry[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}
