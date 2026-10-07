import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { KudosController } from './kudos.controller';
import { KudosService } from './kudos.service';

@Module({
  imports: [PrismaModule],
  controllers: [KudosController],
  providers: [KudosService, SessionAuthGuard],
  exports: [KudosService],
})
export class KudosModule {}
