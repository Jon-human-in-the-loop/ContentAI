import {
  Controller, Post, Get, Body, Request, Res,
  RawBodyRequest, Req, Headers, HttpCode,
} from '@nestjs/common';
import { Request as ExpressRequest, Response } from 'express';
import { BillingService } from './billing.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  /**
   * GET /api/v1/billing/status
   * Current plan and usage for the authenticated org
   */
  @Get('status')
  getStatus(@Request() req) {
    return this.billing.getBillingStatus(req.user.orgId);
  }

  /**
   * POST /api/v1/billing/checkout
   * Create a Stripe Checkout session and redirect
   */
  @Post('checkout')
  async checkout(
    @Request() req,
    @Body() body: { plan: 'STARTER' | 'PRO' | 'ENTERPRISE' },
    @Res() res: Response,
  ) {
    const url = await this.billing.createCheckoutSession(req.user.orgId, body.plan);
    if (!url) {
      return res.status(503).json({
        message: 'Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* env vars.',
      });
    }
    return res.redirect(303, url);
  }

  /**
   * POST /api/v1/billing/portal
   * Open Stripe billing portal for subscription management
   */
  @Post('portal')
  async portal(@Request() req, @Res() res: Response) {
    const url = await this.billing.createPortalSession(req.user.orgId);
    if (!url) {
      return res.status(503).json({ message: 'Billing portal not available — Stripe not configured.' });
    }
    return res.redirect(303, url);
  }

  /**
   * POST /api/v1/billing/webhook
   * Stripe webhook endpoint (must be @Public — no JWT, uses Stripe signature)
   */
  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: RawBodyRequest<ExpressRequest>,
    @Headers('stripe-signature') sig: string,
  ) {
    await this.billing.handleWebhook(req.rawBody!, sig);
    return { received: true };
  }
}
