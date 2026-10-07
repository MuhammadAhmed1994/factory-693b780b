import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../../common/session-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReactionDto } from './reactions.controller';

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
    dto: CreateReactionDto,
    member: AuthenticatedUser,
  ): Promise<ReactionWithAssociations> {
    const kudos = await this.prisma.kudos.findUnique({ where: { id: kudosId }, select: { id: true } });
    if (!kudos) {
      throw new NotFoundException('Kudos item not found');
    }

    try {
      return await this.prisma.reaction.create({
        data: { userId: member.id, kudosId: kudos.id, emoji: dto.emoji },
        include: {
          user: { select: { id: true, email: true } },
          kudos: true,
        },
      });
    } catch (error: unknown) {
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
