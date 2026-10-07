import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/session-auth.guard';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { ListKudosDto } from './dto/list-kudos.dto';
import {
  CreatedKudos,
  KudosBoardPage,
  KudosService,
  TeamMemberDirectoryEntry,
} from './kudos.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post('kudos')
  createKudos(
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateKudosDto,
  ): Promise<CreatedKudos> {
    return this.kudosService.createKudos(user.id, input);
  }

  @Get('kudos')
  listKudos(@Query() query: ListKudosDto): Promise<KudosBoardPage> {
    return this.kudosService.listKudos(query.page ?? 1);
  }

  @Get('members')
  listMembers(): Promise<TeamMemberDirectoryEntry[]> {
    return this.kudosService.listMembers();
  }
}
