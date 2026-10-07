import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthenticatedUser, SessionAuthGuard } from '../common/session-auth.guard';
import { CreateKudosDto } from './dto/create-kudos.dto';
import { ListKudosDto } from './dto/list-kudos.dto';
import {
  KudosPage,
  KudosService,
  KudosWithRecipient,
  MemberDirectoryEntry,
} from './kudos.service';

const requestValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => new BadRequestException(errors),
});

@Controller()
@UseGuards(SessionAuthGuard)
export class KudosController {
  constructor(private readonly kudosService: KudosService) {}

  @Post('kudos')
  @UsePipes(requestValidationPipe)
  createKudos(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateKudosDto,
  ): Promise<KudosWithRecipient> {
    return this.kudosService.createKudos(user.id, dto.recipientId, dto.message);
  }

  @Get('kudos')
  @UsePipes(requestValidationPipe)
  listKudos(@Query() query: ListKudosDto): Promise<KudosPage> {
    return this.kudosService.listKudos(query.page ?? 1);
  }

  @Get('members')
  listMembers(): Promise<MemberDirectoryEntry[]> {
    return this.kudosService.listMembers();
  }
}
