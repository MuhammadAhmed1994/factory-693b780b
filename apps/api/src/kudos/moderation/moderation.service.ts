import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** A kudos item after it has been hidden by a team lead. */
export type HiddenKudos = Prisma.KudosGetPayload<object>;

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(id: string, leadId: string): Promise<HiddenKudos> {
    try {
      return await this.prisma.kudos.update({
        where: { id },
        data: {
          isHidden: true,
          hiddenAt: new Date(),
          hiddenById: leadId,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Kudos item not found');
      }
      throw error;
    }
  }
}
