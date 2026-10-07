import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/session-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKudosDto } from './dto/create-kudos.dto';

export const KUDOS_PAGE_SIZE = 20;

export type KudosWithRecipient = Prisma.KudosGetPayload<{
  include: { recipient: { select: { id: true; email: true } } };
}>;

export interface MemberDirectoryEntry {
  id: string;
  email: string;
}

export interface KudosPage {
  items: KudosWithRecipient[];
  page: number;
  pageSize: number;
}

@Injectable()
export class KudosService {
  constructor(private readonly prisma: PrismaService) {}

  async createKudos(dto: CreateKudosDto, author: AuthenticatedUser): Promise<KudosWithRecipient> {
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true },
    });
    if (!recipient) {
      throw new BadRequestException('The selected recipient does not exist');
    }

    return this.prisma.kudos.create({
      data: {
        authorId: author.id,
        recipientId: recipient.id,
        message: dto.message,
      },
      include: { recipient: { select: { id: true, email: true } } },
    });
  }

  async listKudos(pageNumber = 1): Promise<KudosPage> {
    const items = await this.prisma.kudos.findMany({
      where: { isHidden: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (pageNumber - 1) * KUDOS_PAGE_SIZE,
      take: KUDOS_PAGE_SIZE,
      include: { recipient: { select: { id: true, email: true } } },
    });
    return { items, page: pageNumber, pageSize: KUDOS_PAGE_SIZE };
  }

  async listMembers(): Promise<MemberDirectoryEntry[]> {
    return this.prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    });
  }
}
