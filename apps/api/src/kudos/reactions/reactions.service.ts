import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** A recorded reaction together with its associated member and kudos item. */
export type CreatedReaction = Prisma.ReactionGetPayload<{
  include: {
    user: { select: { id: true; email: true } };
    kudos: true;
  };
}>;

@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReaction(userId: string, kudosId: string, emoji: string): Promise<CreatedReaction> {
    const kudos = await this.prisma.kudos.findUnique({
      where: { id: kudosId },
      select: { id: true },
    });
    if (!kudos) {
      throw new NotFoundException('Kudos item not found');
    }

    try {
      return await this.prisma.reaction.create({
        data: { userId, kudosId: kudos.id, emoji },
        include: {
          user: { select: { id: true, email: true } },
          kudos: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('You have already reacted to this kudos item');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError ||
      (typeof error === 'object' && error !== null && 'code' in error)
    ) && (error as { code?: unknown }).code === 'P2002';
  }
}
