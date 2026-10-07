import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthenticatedUser } from '../../common/session-auth.guard';
import { SessionAuthGuard } from '../../common/session-auth.guard';
import { ReactionWithAssociations, ReactionsService } from './reactions.service';

export class CreateReactionDto {
  @IsString()
  @IsNotEmpty()
  emoji!: string;
}

@Controller('kudos/:id/reactions')
@UseGuards(SessionAuthGuard)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  create(
    @Param('id') kudosId: string,
    @Body() dto: CreateReactionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReactionWithAssociations> {
    return this.reactionsService.createReaction(kudosId, dto, user);
  }
}
