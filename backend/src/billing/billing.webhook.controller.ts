import { Controller, Headers, Post, Req } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post('webhook')
  async webhook(
    @Req() req: { rawBody?: string },
    @Headers('stripe-signature') signature?: string,
  ) {
    const body = (req as any).rawBody as string | undefined;
    return await this.billing.handleWebhook({
      body: body ?? '',
      signature: signature ?? '',
    });
  }
}
