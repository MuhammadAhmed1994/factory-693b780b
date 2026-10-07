import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RolesGuard } from '../../common/roles.guard';
import { SessionAuthGuard } from '../../common/session-auth.guard';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModerationController],
  providers: [ModerationService, SessionAuthGuard, RolesGuard],
})
export class ModerationModule {}
