import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { requireUserEmail } from '../common/user-email';
import { BotsService } from './bots.service';

type CreateBotBody = {
  name?: string;
};

@Controller('bots')
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Get()
  async list(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.listByEmail(email);
  }

  @Post()
  async create(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: CreateBotBody,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.createByEmail(email, body ?? {});
  }

  @Get(':botId')
  async get(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.getByEmail(email, botId);
  }

  @Delete(':botId')
  async remove(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.deleteByEmail(email, botId);
  }

  @Post(':botId/activate')
  async activate(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
    @Body() body: { active?: boolean },
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.setActiveByEmail(email, botId, !!body?.active);
  }
}
