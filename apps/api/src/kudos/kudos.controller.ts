import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/session-auth.guard';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { ListKudosDto } from './dto/list-kudos.dto';
import {
  BoardPage,
  CreatedKudos,
  KudosService,
  MemberDirectoryEntry,
} from './kudos.service';

@Controller()
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post('kudos')
  createKudos(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateKudosDto,
  ): Promise<CreatedKudos> {
    return this.kudosService.createKudos(user.id, dto);
  }

  @Get('kudos')
  getKudos(@Query() query: ListKudosDto): Promise<BoardPage> {
    return this.kudosService.listKudos(query.page ?? 1);
  }

  @Get('members')
  getMembers(): Promise<MemberDirectoryEntry[]> {
    return this.kudosService.getMembers();
  }
}
