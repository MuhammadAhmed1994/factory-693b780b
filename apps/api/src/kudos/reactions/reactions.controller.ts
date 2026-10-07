import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../../common/session-auth.guard';
import { CreatedReaction, ReactionsService } from './reactions.service';

/** Request body for adding an emoji reaction to a kudos item. */
export class CreateReactionDto {
  @IsString()
  @Matches(/\\S/, { message: 'emoji must not be blank' })
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
    @Body() input: CreateReactionDto,
  ): Promise<CreatedReaction> {
    return this.reactionsService.createReaction(user.id, kudosId, input.emoji);
  }
}
