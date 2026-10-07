import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthenticatedUser } from '../common/session-auth.guard';
import { SessionAuthGuard } from '../common/session-auth.guard';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { ListKudosDto } from './dto/list-kudos.dto';
import {
  KudosPage,
  KudosService,
  KudosWithRecipient,
  MemberDirectoryEntry,
} from './kudos.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post('kudos')
  create(
    @Body() dto: CreateKudosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KudosWithRecipient> {
    return this.kudosService.createKudos(dto, user);
  }

  @Get('kudos')
  list(@Query() query: ListKudosDto): Promise<KudosPage> {
    return this.kudosService.listKudos(query.page ?? 1);
  }

  @Get('members')
  members(): Promise<MemberDirectoryEntry[]> {
    return this.kudosService.listMembers();
  }
}
