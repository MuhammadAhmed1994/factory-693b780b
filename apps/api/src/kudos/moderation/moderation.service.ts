import { Injectable, NotFoundException } from '@nestjs/common';
import { Kudos } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** The persisted kudos item, including moderation state. */
export type HiddenKudos = Kudos;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(id: string, hiddenById: string): Promise<HiddenKudos> {
    const existing = await this.prisma.kudos.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
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
