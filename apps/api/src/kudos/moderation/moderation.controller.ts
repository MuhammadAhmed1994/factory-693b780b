import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { AuthenticatedUser, SessionAuthGuard } from '../../common/session-auth.guard';
import { HiddenKudos, ModerationService } from './moderation.service';

@Controller('kudos')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Patch(':id/hide')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.LEAD)
  hideKudos(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<HiddenKudos> {
    return this.moderationService.hideKudos(id, user.id);
  }
}
