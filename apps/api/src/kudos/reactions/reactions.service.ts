import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateReactionDto } from './reactions.controller';

export type CreatedReaction = Prisma.ReactionGetPayload<{
  include: {
    user: { select: { id: true; email: true; role: true } };
    kudos: true;
  };
}>;

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(
    userId: string,
    kudosId: string,
    dto: CreateReactionDto,
  ): Promise<CreatedReaction> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException('The kudos item does not exist');
    }

    try {
      return await this.prisma.reaction.create({
        data: { userId, kudosId, emoji: dto.emoji },
        include: {
          user: { select: { id: true, email: true, role: true } },
          kudos: true,
        },
      });
    } catch (error) {
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
