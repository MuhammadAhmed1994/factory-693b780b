import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../../common/session-auth.guard';
import { ReactionWithAssociations, ReactionsService } from './reactions.service';

export class CreateReactionDto {
  @IsString()
  @Matches(/\S/, { message: 'emoji must not be blank' })
  emoji!: string;
}

@Controller('kudos/:id/reactions')
@UseGuards(SessionAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  createReaction(
    @Param('id') kudosId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReactionDto,
  ): Promise<ReactionWithAssociations> {
    return this.reactionsService.createReaction(kudosId, user.id, dto.emoji);
  }
}
