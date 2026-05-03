import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getMeByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        subscription: true,
        _count: { select: { bots: true, trades: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { user };
  }

  async updateMeByEmail(email: string, input: { name?: string }) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { ...(input.name ? { name: input.name } : {}) },
      select: { id: true, email: true, name: true },
    });
    return { user: updated };
  }
}
