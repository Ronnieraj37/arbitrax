import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { requireUserEmail } from '../common/user-email';
import { BotsService } from './bots.service';

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
    @Body() body: { name?: string },
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

  @Get(':botId/workflow')
  async getWorkflow(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.getWorkflowGraph(email, botId);
  }

  @Patch(':botId/workflow')
  async saveWorkflow(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
    @Body() body: { nodes: unknown[]; edges: unknown[]; name?: string },
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.saveWorkflowGraph(email, botId, body);
  }

  @Post(':botId/run')
  async run(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Param('botId') botId: string,
  ) {
    const email = requireUserEmail(headers);
    return await this.bots.runOnce(email, botId);
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
