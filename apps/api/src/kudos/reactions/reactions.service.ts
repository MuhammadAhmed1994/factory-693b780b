import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Reaction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ReactionWithAssociations = Prisma.ReactionGetPayload<{
  include: {
    user: { select: { id: true; email: true } };
    kudos: true;
  };
}>;

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(
    kudosId: string,
    userId: string,
    emoji: string,
  ): Promise<ReactionWithAssociations> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException('Kudos item not found');
    }

    const existing = await this.prisma.reaction.findUnique({
      where: { userId_kudosId: { userId, kudosId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You have already reacted to this kudos item');
    }

    try {
      return await this.prisma.reaction.create({
        data: { userId, kudosId, emoji },
        include: {
          user: { select: { id: true, email: true } },
          kudos: true,
        },
      });
    } catch (error: unknown) {
      // The database uniqueness constraint also protects concurrent requests.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You have already reacted to this kudos item');
      }
      throw error;
    }
  }
}
