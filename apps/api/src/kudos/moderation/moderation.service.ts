import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Persisted kudos fields returned after a successful moderation action. */
export type HiddenKudos = Prisma.KudosGetPayload<{}>;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(id: string, leadId: string): Promise<HiddenKudos> {
    return this.prisma.kudos.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenById: leadId,
      },
    });
  }
}
