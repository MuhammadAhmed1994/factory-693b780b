import { Injectable, NotFoundException } from '@nestjs/common';
import { Kudos } from '@prisma/client';
import { AuthenticatedUser } from '../../common/session-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(id: string, lead: AuthenticatedUser): Promise<Kudos> {
    const item = await this.prisma.kudos.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Kudos item not found');
    }

    return this.prisma.kudos.update({
      where: { id },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenById: lead.id,
      },
    });
  }
}
