import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { AuthenticatedUser, SessionAuthGuard } from '../../common/session-auth.guard';
import { KudosWithRecipient } from '../kudos.service';
import { ModerationService } from './moderation.service';

@Controller()
@UseGuards(SessionAuthGuard, RolesGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Patch('kudos/:id/hide')
  @Roles(UserRole.LEAD)
  hideKudos(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KudosWithRecipient> {
    return this.moderationService.hideKudos(id, user.id);
  }
}
