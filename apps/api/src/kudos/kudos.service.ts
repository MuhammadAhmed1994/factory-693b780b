import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

const PAGE_SIZE = 20;

export type CreatedKudos = Prisma.KudosGetPayload<{
  include: { recipient: { select: { id: true; email: true; role: true } } };
}>;

export type BoardKudos = Prisma.KudosGetPayload<{
  include: {
    author: { select: { id: true; email: true; role: true } };
    recipient: { select: { id: true; email: true; role: true } };
    reactions: { include: { user: { select: { id: true; email: true; role: true } } } };
  };
}>;

export type MemberDirectoryEntry = Prisma.UserGetPayload<{
  select: { id: true; email: true };
}>;

export interface BoardPage {
  items: BoardKudos[];
  page: number;
  pageSize: number;
}

@Injectable()
export class KudosService {
  constructor(private readonly prisma: PrismaService) {}

  async createKudos(authorId: string, dto: CreateKudosDto): Promise<CreatedKudos> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('The selected recipient does not exist');
    }

    return this.prisma.kudos.create({
      data: {
        authorId,
        recipientId: dto.recipientId,
        message: dto.message,
      },
      include: {
        recipient: { select: { id: true, email: true, role: true } },
      },
    });
  }

  async listKudos(page: number): Promise<BoardPage> {
    const items = await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, email: true, role: true } },
        recipient: { select: { id: true, email: true, role: true } },
        reactions: {
          include: { user: { select: { id: true, email: true, role: true } } },
        },
      },
    });
    return { items, page, pageSize: PAGE_SIZE };
  }

  async getMembers(): Promise<MemberDirectoryEntry[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}
