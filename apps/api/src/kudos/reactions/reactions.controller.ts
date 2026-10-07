import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../../common/session-auth.guard';
import { CreatedReaction, ReactionsService } from './reactions.service';

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
  createReaction(
    @Param('id') kudosId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReactionDto,
  ): Promise<CreatedReaction> {
    return this.reactionsService.createReaction(user.id, kudosId, dto);
  }
}
