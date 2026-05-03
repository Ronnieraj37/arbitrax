import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { PLANS, PlanKey, stripe } from './stripe';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(email: string, planRaw?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const plan = (planRaw ?? '').toUpperCase() as PlanKey;
    const planConfig = (PLANS as any)[plan] as
      | { priceId: string | null }
      | undefined;
    if (!planConfig?.priceId) {
      throw new BadRequestException(
        'Invalid plan or no Stripe price configured',
      );
    }

    let subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    let customerId = subscription?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      if (subscription) {
        subscription = await this.prisma.subscription.update({
          where: { userId: user.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        subscription = await this.prisma.subscription.create({
          data: {
            userId: user.id,
            plan: 'FREE',
            stripeCustomerId: customerId,
            status: 'ACTIVE',
          },
        });
      }
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${appUrl.replace(/\/$/, '')}/billing?success=true`,
      cancel_url: `${appUrl.replace(/\/$/, '')}/billing?canceled=true`,
      metadata: { userId: user.id, plan },
    });

    return { url: checkoutSession.url };
  }

  async createPortal(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new ForbiddenException('User not found');

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException('No billing account found');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${appUrl.replace(/\/$/, '')}/billing`,
    });

    return { url: portalSession.url };
  }

  async handleWebhook(input: { body: string; signature: string }) {
    const sig = input.signature;
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestException('Missing signature');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        input.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan?.toUpperCase();

        if (userId && plan && (plan === 'PRO' || plan === 'ENTERPRISE')) {
          const sub = (await stripe.subscriptions.retrieve(
            session.subscription as string,
          )) as any as {
            id: string;
            items: { data: { price: { id: string } }[] };
            current_period_start: number;
            current_period_end: number;
            status: string;
            cancel_at_period_end: boolean;
          };

          await this.prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              plan: plan as 'PRO' | 'ENTERPRISE',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id,
              status: 'ACTIVE',
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
            update: {
              plan: plan as 'PRO' | 'ENTERPRISE',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items.data[0]?.price.id,
              status: 'ACTIVE',
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as any as {
          id: string;
          status: string;
          cancel_at_period_end: boolean;
          current_period_start: number;
          current_period_end: number;
        };
        const existing = await this.prisma.subscription.findUnique({
          where: { stripeSubscriptionId: sub.id },
        });
        if (existing) {
          await this.prisma.subscription.update({
            where: { stripeSubscriptionId: sub.id },
            data: {
              status:
                sub.status === 'active'
                  ? 'ACTIVE'
                  : sub.status === 'past_due'
                    ? 'PAST_DUE'
                    : 'CANCELED',
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any as { id: string };
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            plan: 'FREE',
            status: 'CANCELED',
            stripeSubscriptionId: null,
          },
        });
        break;
      }
    }

    return { received: true };
  }
}
