import { Module } from '@nestjs/common';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosController],
  providers: [KudosService, SessionAuthGuard],
  exports: [KudosService],
})
export class KudosModule {}
