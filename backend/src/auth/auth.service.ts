import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async onSignIn(input: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }) {
    const email = (input.email ?? undefined) || undefined;
    if (!email) {
      return { ok: true, userId: null };
    }

    const user =
      (await this.prisma.user.findUnique({ where: { email } })) ??
      (await this.prisma.user.create({
        data: {
          email,
          name: input.name ?? undefined,
          image: input.image ?? undefined,
        },
      }));

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, plan: 'FREE', status: 'ACTIVE' },
    });

    return { ok: true, userId: user.id };
  }
}
