import { Body, Controller, Headers, Post } from '@nestjs/common';
import { requireUserEmail } from '../common/user-email';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  async checkout(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: { plan?: string },
  ) {
    const email = requireUserEmail(headers);
    return await this.billing.createCheckout(email, body?.plan);
  }

  @Post('portal')
  async portal(
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    const email = requireUserEmail(headers);
    return await this.billing.createPortal(email);
  }
}
