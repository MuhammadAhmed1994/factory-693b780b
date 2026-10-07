import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** A persisted kudos item returned by the moderation action. */
export type HiddenKudos = Prisma.KudosGetPayload<{}>;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(id: string, hiddenById: string): Promise<HiddenKudos> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException('Kudos item not found');
    }

    return this.prisma.kudos.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenById,
      },
    });
  }
}
