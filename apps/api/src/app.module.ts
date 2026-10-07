import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { KudosModule } from './kudos/kudos.module';
import { ModerationModule } from './kudos/moderation/moderation.module';
import { ReactionsModule } from './kudos/reactions/reactions.module';
import { PrismaModule } from './prisma/prisma.module';

// Written by the factory. The wiring task registers every feature module here.
@Module({
  imports: [PrismaModule, AuthModule, KudosModule, ReactionsModule, ModerationModule],
})
export class AppModule {}
