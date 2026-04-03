import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import * as StripeLib from 'stripe';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const StripeConstructor = require('stripe');

export const PLAN_PRICE_IDS: Record<string, string | undefined> = {};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: StripeLib.Stripe | null = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new StripeConstructor(secretKey, { apiVersion: '2025-03-31.basil' }) as StripeLib.Stripe;
      // Map plan names to Stripe Price IDs from env
      PLAN_PRICE_IDS['STARTER'] = this.config.get('STRIPE_PRICE_STARTER');
      PLAN_PRICE_IDS['PRO'] = this.config.get('STRIPE_PRICE_PRO');
      PLAN_PRICE_IDS['ENTERPRISE'] = this.config.get('STRIPE_PRICE_ENTERPRISE');
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  /**
   * Create or retrieve a Stripe customer for the organization
   */
  async getOrCreateCustomer(orgId: string): Promise<string | null> {
    if (!this.stripe) return null;

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return null;

    // Return existing Stripe customer ID if already stored
    if ((org as any).stripeCustomerId) return (org as any).stripeCustomerId;

    try {
      const customer = await this.stripe.customers.create({
        name: org.name,
        metadata: { orgId },
      });

      // Persist the customer ID (raw query to avoid schema migration for now)
      await this.prisma.$executeRaw`
        UPDATE "Organization" SET "stripeCustomerId" = ${customer.id} WHERE id = ${orgId}
      `;

      return customer.id;
    } catch (err) {
      this.logger.error('Failed to create Stripe customer:', err);
      return null;
    }
  }

  /**
   * Create a Stripe Checkout session for a plan upgrade
   */
  async createCheckoutSession(orgId: string, plan: 'STARTER' | 'PRO' | 'ENTERPRISE'): Promise<string | null> {
    if (!this.stripe) return null;

    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) {
      this.logger.warn(`No Stripe price ID configured for plan ${plan}`);
      return null;
    }

    const customerId = await this.getOrCreateCustomer(orgId);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId || undefined,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}?billing=success&plan=${plan}`,
        cancel_url: `${frontendUrl}?billing=cancel`,
        metadata: { orgId, plan },
      });

      return session.url;
    } catch (err) {
      this.logger.error('Failed to create checkout session:', err);
      return null;
    }
  }

  /**
   * Create a billing portal session so users can manage their subscription
   */
  async createPortalSession(orgId: string): Promise<string | null> {
    if (!this.stripe) return null;

    const customerId = await this.getOrCreateCustomer(orgId);
    if (!customerId) return null;

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${frontendUrl}?settings=billing`,
      });
      return session.url;
    } catch (err) {
      this.logger.error('Failed to create portal session:', err);
      return null;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    if (!this.stripe) return;

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured — skipping webhook verification');
      return;
    }

    let event: StripeLib.Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as StripeLib.Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId;
        const plan = session.metadata?.plan as string;
        if (orgId && plan) {
          await this.updateOrgPlan(orgId, plan, session.subscription as string);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as StripeLib.Stripe.Subscription;
        await this.syncSubscription(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as StripeLib.Stripe.Subscription;
        const orgId = sub.metadata?.orgId;
        if (orgId) {
          await this.updateOrgPlan(orgId, 'STARTER', null);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as StripeLib.Stripe.Invoice;
        this.logger.warn(`Payment failed for customer ${invoice.customer}`);
        // Could send notification email here
        break;
      }
    }
  }

  private async updateOrgPlan(orgId: string, plan: string, subscriptionId: string | null): Promise<void> {
    try {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: plan as any,
          // Token limits per plan
          monthlyTokenLimit: plan === 'ENTERPRISE' ? 10_000_000 : plan === 'PRO' ? 3_000_000 : 1_000_000,
        },
      });
      this.logger.log(`Updated org ${orgId} to plan ${plan}`);
    } catch (err) {
      this.logger.error(`Failed to update org plan for ${orgId}:`, err);
    }
  }

  private async syncSubscription(sub: StripeLib.Stripe.Subscription): Promise<void> {
    // Find org by Stripe customer ID
    const orgs = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Organization" WHERE "stripeCustomerId" = ${sub.customer as string}
    `;
    if (!orgs.length) return;
    const orgId = orgs[0].id;

    // Determine plan from price ID
    const priceId = sub.items.data[0]?.price.id;
    let plan = 'STARTER';
    if (priceId === PLAN_PRICE_IDS['PRO']) plan = 'PRO';
    else if (priceId === PLAN_PRICE_IDS['ENTERPRISE']) plan = 'ENTERPRISE';

    await this.updateOrgPlan(orgId, plan, sub.id);
  }

  /**
   * Get current billing status for an org
   */
  async getBillingStatus(orgId: string): Promise<object> {
    if (!this.stripe) {
      return {
        configured: false,
        message: 'Stripe not configured — set STRIPE_SECRET_KEY to enable billing',
      };
    }

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return { configured: true, plan: null };

    return {
      configured: true,
      plan: org.plan,
      tokensUsed: org.tokensUsed,
      monthlyTokenLimit: org.monthlyTokenLimit,
      availablePlans: {
        STARTER: { limit: '1M tokens/month', price: 'Free' },
        PRO: { limit: '3M tokens/month', configured: !!PLAN_PRICE_IDS['PRO'] },
        ENTERPRISE: { limit: '10M tokens/month', configured: !!PLAN_PRICE_IDS['ENTERPRISE'] },
      },
    };
  }
}
