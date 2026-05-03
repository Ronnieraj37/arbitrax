import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeeperhubService } from './keeperhub.service';

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kh: KeeperhubService,
  ) {}

  private decorate<T extends { keeperhubWorkflowId: string | null }>(b: T) {
    return {
      ...b,
      editorUrl: b.keeperhubWorkflowId
        ? this.kh.editorUrl(b.keeperhubWorkflowId)
        : null,
      webhookUrl: b.keeperhubWorkflowId
        ? this.kh.webhookUrl(b.keeperhubWorkflowId)
        : null,
    };
  }

  async listByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { bots: [] };

    const bots = await this.prisma.bot.findMany({
      where: { userId: user.id },
      include: { _count: { select: { trades: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { bots: bots.map((b) => this.decorate(b)) };
  }

  async createByEmail(email: string, input: { name?: string }) {
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, name: email.split('@')[0] || 'User' },
      update: {},
    });

    const name = (input.name ?? '').trim();
    if (!name || name.length > 100) {
      throw new BadRequestException('Invalid name');
    }

    const [botCount, subscription] = await Promise.all([
      this.prisma.bot.count({ where: { userId: user.id } }),
      this.prisma.subscription.upsert({
        where: { userId: user.id },
        create: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
        update: {},
      }),
    ]);

    const plan = subscription?.plan ?? 'FREE';
    const limit = plan === 'ENTERPRISE' ? 100 : plan === 'PRO' ? 3 : 1;
    if (botCount >= limit) {
      throw new ForbiddenException(
        `Bot limit reached (${limit}) for your ${plan} plan`,
      );
    }

    // 1. Create the KeeperHub workflow first. If KH is misconfigured, fail
    //    fast with a 503 — no half-created local row to clean up.
    const workflow = await this.kh.createWorkflow({
      name,
      description: `ZLabs bot · ${name}`,
    });

    // 2. Persist the local pointer.
    const bot = await this.prisma.bot.create({
      data: {
        userId: user.id,
        name,
        keeperhubWorkflowId: workflow.id,
      },
    });

    this.logger.log(
      `Bot created: ${bot.id} | KH workflow: ${workflow.id} | user: ${email}`,
    );

    return this.decorate(bot);
  }

  async getByEmail(email: string, botId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
      include: { _count: { select: { trades: true } } },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    return this.decorate(bot);
  }

  async deleteByEmail(email: string, botId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    if (bot.keeperhubWorkflowId) {
      await this.kh
        .deleteWorkflow(bot.keeperhubWorkflowId)
        .catch((e) =>
          this.logger.warn(
            `KH delete failed for ${bot.keeperhubWorkflowId}: ${e.message}`,
          ),
        );
    }

    await this.prisma.bot.delete({ where: { id: botId } });
    this.logger.log(`Bot deleted: ${botId} | user: ${email}`);
    return { success: true };
  }

  async getWorkflowGraph(email: string, botId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    if (!bot.keeperhubWorkflowId) {
      throw new BadRequestException('Bot has no linked KeeperHub workflow');
    }

    const wf = await this.kh.getWorkflow(bot.keeperhubWorkflowId);
    return {
      bot: this.decorate(bot),
      nodes: wf.nodes ?? [],
      edges: wf.edges ?? [],
      name: wf.name,
      description: wf.description,
    };
  }

  async saveWorkflowGraph(
    email: string,
    botId: string,
    body: { nodes: unknown[]; edges: unknown[]; name?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    if (!bot.keeperhubWorkflowId) {
      throw new BadRequestException('Bot has no linked KeeperHub workflow');
    }

    const wf = await this.kh.updateWorkflow(bot.keeperhubWorkflowId, {
      nodes: body.nodes,
      edges: body.edges,
      ...(body.name ? { name: body.name } : {}),
    });

    if (body.name && body.name !== bot.name) {
      await this.prisma.bot.update({
        where: { id: botId },
        data: { name: body.name },
      });
    }

    return { success: true, updatedAt: wf.updatedAt };
  }

  async runOnce(email: string, botId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    if (!bot.keeperhubWorkflowId) {
      throw new BadRequestException('Bot has no linked KeeperHub workflow');
    }

    const result = await this.kh.triggerWebhook(bot.keeperhubWorkflowId, {
      source: 'arbitrax-test-run',
      botId,
      firedAt: new Date().toISOString(),
    });
    return result;
  }

  async setActiveByEmail(email: string, botId: string, active: boolean) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    if (bot.keeperhubWorkflowId) {
      await this.kh
        .updateWorkflow(bot.keeperhubWorkflowId, { enabled: active })
        .catch((e) =>
          this.logger.warn(
            `KH enable=${active} failed for ${bot.keeperhubWorkflowId}: ${e.message}`,
          ),
        );
    }

    const updated = await this.prisma.bot.update({
      where: { id: botId },
      data: { status: active ? 'ACTIVE' : 'INACTIVE' },
    });
    return this.decorate(updated);
  }
}
