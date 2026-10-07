import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KudosWithRecipient } from '../kudos.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async hideKudos(kudosId: string, leadId: string): Promise<KudosWithRecipient> {
    const existingKudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!existingKudos) {
      throw new NotFoundException('Kudos item not found');
    }

    return this.prisma.kudos.update({
      where: { id: kudosId },
      data: {
        isHidden: true,
        hiddenAt: new Date(),
        hiddenById: leadId,
      },
      include: { recipient: { select: { id: true, email: true } } },
    });
  }
}
