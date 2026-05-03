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

  async listByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { bots: [] };

    const bots = await this.prisma.bot.findMany({
      where: { userId: user.id },
      include: {
        // legacy fields kept nullable for dashboard back-compat; new KH-native bots have none of these
        config: true,
        apiKeys: {
          select: {
            id: true,
            key: true,
            secret: true,
            label: true,
            isActive: true,
          },
        },
        _count: { select: { trades: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      bots: bots.map((b) => ({
        ...b,
        editorUrl: b.keeperhubWorkflowId
          ? this.kh.editorUrl(b.keeperhubWorkflowId)
          : null,
        webhookUrl: b.keeperhubWorkflowId
          ? this.kh.webhookUrl(b.keeperhubWorkflowId)
          : null,
      })),
    };
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

    const bot = await this.prisma.bot.create({
      data: { userId: user.id, name },
    });

    let workflow;
    try {
      // Create an empty KeeperHub workflow. KeeperHub's editor seeds it with a
      // default trigger node + empty action node — the user takes it from there.
      workflow = await this.kh.createWorkflow({
        name,
        description: `ZLabs bot · ${name}`,
        nodes: [],
        edges: [],
      });
    } catch (e) {
      await this.prisma.bot.delete({ where: { id: bot.id } }).catch(() => {});
      throw e;
    }

    const updated = await this.prisma.bot.update({
      where: { id: bot.id },
      data: { keeperhubWorkflowId: workflow.id },
    });

    this.logger.log(
      `Bot created: ${bot.id} | KH workflow: ${workflow.id} | user: ${email}`,
    );

    return {
      bot: updated,
      editorUrl: this.kh.editorUrl(workflow.id),
      webhookUrl: this.kh.webhookUrl(workflow.id),
    };
  }

  async getByEmail(email: string, botId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
      include: {
        trades: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    return {
      bot,
      editorUrl: bot.keeperhubWorkflowId
        ? this.kh.editorUrl(bot.keeperhubWorkflowId)
        : null,
      webhookUrl: bot.keeperhubWorkflowId
        ? this.kh.webhookUrl(bot.keeperhubWorkflowId)
        : null,
    };
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

  async setActiveByEmail(email: string, botId: string, active: boolean) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, userId: user.id },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    const updated = await this.prisma.bot.update({
      where: { id: botId },
      data: { status: active ? 'ACTIVE' : 'INACTIVE' },
    });
    return { bot: updated };
  }
}
