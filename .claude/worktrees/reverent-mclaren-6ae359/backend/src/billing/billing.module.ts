import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService],
})
export class BillingModule {}
