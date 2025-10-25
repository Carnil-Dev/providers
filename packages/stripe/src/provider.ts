import Stripe from 'stripe';
import type {
  Customer,
  PaymentMethod,
  PaymentIntent,
  Subscription,
  Invoice,
  Refund,
  Dispute,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreatePaymentIntentRequest,
  CreateSubscriptionRequest,
  CreateInvoiceRequest,
  CreateRefundRequest,
  CustomerListRequest,
  PaymentIntentListRequest,
  SubscriptionListRequest,
  InvoiceListRequest,
  ListResponse,
  WebhookEvent,
  UsageMetrics,
  AIUsageMetrics,
  ProviderConfig,
} from '@carnil/core';

import type { CarnilProvider } from '@carnil/core';
import { CarnilError, createProviderError } from '@carnil/core';

export class StripeProvider implements CarnilProvider {
  public readonly name = 'stripe';
  public readonly version = '1.0.0';
  public readonly config: ProviderConfig;
  public readonly supportedFeatures = [
    'customers',
    'payments',
    'subscriptions',
    'invoices',
    'refunds',
    'disputes',
    'webhooks',
    'analytics',
  ];
  public readonly supportedCurrencies = [
    'usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'sek', 'nok', 'dkk',
    'pln', 'czk', 'huf', 'bgn', 'hrk', 'ron', 'try', 'rub', 'uah', 'byn',
    'kzt', 'uzs', 'kgs', 'tjs', 'amd', 'azn', 'gel', 'mdl', 'bam', 'mkd',
    'rsd', 'mnt', 'krw', 'sgd', 'hkd', 'twd', 'thb', 'vnd', 'idr', 'myr',
    'php', 'inr', 'lkr', 'bdt', 'pkr', 'afn', 'npr', 'btc', 'eth', 'ltc',
  ];
  public readonly supportedCountries = [
    'US', 'CA', 'GB', 'AU', 'AT', 'BE', 'BG', 'BR', 'CH', 'CY', 'CZ', 'DE',
    'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'JP', 'LI',
    'LT', 'LU', 'LV', 'MT', 'MX', 'MY', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO',
    'SE', 'SG', 'SI', 'SK', 'TH', 'IN', 'ID', 'PH', 'VN', 'KR', 'TW', 'HK',
  ];

  private stripe: Stripe;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.stripe = new Stripe(config.apiKey, {
      apiVersion: '2023-10-16',
      timeout: config.timeout || 30000,
      maxNetworkRetries: config.retries || 3,
    });
  }

  // ========================================================================
  // Base Provider Implementation
  // ========================================================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      return false;
    }
  }

  async verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      return false;
    }
  }

  async parseWebhook(payload: string, signature: string, secret: string): Promise<WebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: new Date(event.created * 1000),
        provider: 'stripe',
        livemode: event.livemode,
      };
    } catch (error) {
      throw createProviderError('stripe', error, 'Webhook parsing failed');
    }
  }

  // ========================================================================
  // Customer Provider Implementation
  // ========================================================================

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: request.email,
        name: request.name,
        phone: request.phone,
        description: request.description,
        metadata: request.metadata,
      });

      return this.mapStripeCustomer(customer);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async getCustomer(id: string): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(id);
      if (customer.deleted) {
        throw new CarnilError('Customer not found', 'NOT_FOUND', 'NOT_FOUND', 404);
      }
      return this.mapStripeCustomer(customer as Stripe.Customer);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async updateCustomer(id: string, request: UpdateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.update(id, {
        email: request.email,
        name: request.name,
        phone: request.phone,
        description: request.description,
        metadata: request.metadata,
      });

      return this.mapStripeCustomer(customer);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      await this.stripe.customers.del(id);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async listCustomers(request?: CustomerListRequest): Promise<ListResponse<Customer>> {
    try {
      const params: Stripe.CustomerListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
      };

      if (request?.email) {
        params.email = request.email;
      }

      if (request?.created) {
        params.created = {
          gte: request.created.gte?.getTime() / 1000,
          lte: request.created.lte?.getTime() / 1000,
        };
      }

      const customers = await this.stripe.customers.list(params);

      return {
        data: customers.data.map(customer => this.mapStripeCustomer(customer)),
        hasMore: customers.has_more,
        totalCount: customers.data.length,
        nextCursor: customers.data[customers.data.length - 1]?.id,
        prevCursor: customers.data[0]?.id,
      };
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => this.mapStripePaymentMethod(pm));
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  // ========================================================================
  // Payment Provider Implementation
  // ========================================================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency,
        customer: request.customerId,
        description: request.description,
        metadata: request.metadata,
        payment_method: request.paymentMethodId,
        receipt_email: request.receiptEmail,
        capture_method: request.captureMethod,
      });

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async updatePaymentIntent(id: string, updates: Partial<CreatePaymentIntentRequest>): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.update(id, {
        amount: updates.amount ? Math.round(updates.amount * 100) : undefined,
        currency: updates.currency,
        description: updates.description,
        metadata: updates.metadata,
        payment_method: updates.paymentMethodId,
        receipt_email: updates.receiptEmail,
      });

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(id);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async confirmPaymentIntent(id: string, paymentMethodId?: string): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(id, {
        payment_method: paymentMethodId,
      });

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async capturePaymentIntent(id: string, amount?: number): Promise<PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(id, {
        amount_to_capture: amount ? Math.round(amount * 100) : undefined,
      });

      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async listPaymentIntents(request?: PaymentIntentListRequest): Promise<ListResponse<PaymentIntent>> {
    try {
      const params: Stripe.PaymentIntentListParams = {
        limit: request?.limit || 10,
        starting_after: request?.startingAfter,
        ending_before: request?.endingBefore,
        customer: request?.customerId,
      };

      if (request?.status) {
        params.status = request.status as any;
      }

      if (request?.created) {
        params.created = {
          gte: request.created.gte?.getTime() / 1000,
          lte: request.created.lte?.getTime() / 1000,
        };
      }

      const paymentIntents = await this.stripe.paymentIntents.list(params);

      return {
        data: paymentIntents.data.map(pi => this.mapStripePaymentIntent(pi)),
        hasMore: paymentIntents.has_more,
        totalCount: paymentIntents.data.length,
        nextCursor: paymentIntents.data[paymentIntents.data.length - 1]?.id,
        prevCursor: paymentIntents.data[0]?.id,
      };
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  // ========================================================================
  // Mapping Functions
  // ========================================================================

  private mapStripeCustomer(customer: Stripe.Customer): Customer {
    return {
      id: customer.id,
      email: customer.email || undefined,
      name: customer.name || undefined,
      phone: customer.phone || undefined,
      description: customer.description || undefined,
      metadata: customer.metadata,
      created: new Date(customer.created * 1000),
      updated: new Date(customer.created * 1000), // Stripe doesn't track updated time
      deleted: customer.deleted || false,
      provider: 'stripe',
      providerId: customer.id,
    };
  }

  private mapStripePaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentMethod {
    const card = paymentMethod.card;
    return {
      id: paymentMethod.id,
      customerId: paymentMethod.customer as string,
      type: 'card',
      brand: card?.brand,
      last4: card?.last4,
      expiryMonth: card?.exp_month,
      expiryYear: card?.exp_year,
      isDefault: false, // Would need to check customer's default payment method
      metadata: paymentMethod.metadata,
      created: new Date(paymentMethod.created * 1000),
      updated: new Date(paymentMethod.created * 1000),
      provider: 'stripe',
      providerId: paymentMethod.id,
    };
  }

  private mapStripePaymentIntent(paymentIntent: Stripe.PaymentIntent): PaymentIntent {
    return {
      id: paymentIntent.id,
      customerId: paymentIntent.customer as string,
      amount: paymentIntent.amount / 100, // Convert from cents
      currency: paymentIntent.currency,
      status: paymentIntent.status as any,
      clientSecret: paymentIntent.client_secret || undefined,
      description: paymentIntent.description || undefined,
      metadata: paymentIntent.metadata,
      paymentMethodId: paymentIntent.payment_method as string || undefined,
      receiptEmail: paymentIntent.receipt_email || undefined,
      created: new Date(paymentIntent.created * 1000),
      updated: new Date(paymentIntent.created * 1000),
      provider: 'stripe',
      providerId: paymentIntent.id,
    };
  }

  // ========================================================================
  // Placeholder implementations for remaining interfaces
  // ========================================================================

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getSubscription(id: string): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateSubscription(id: string, updates: Partial<CreateSubscriptionRequest>): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async cancelSubscription(id: string, immediately?: boolean): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listSubscriptions(request?: SubscriptionListRequest): Promise<ListResponse<Subscription>> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getInvoice(id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateInvoice(id: string, updates: Partial<CreateInvoiceRequest>): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async finalizeInvoice(id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async payInvoice(id: string, paymentMethodId?: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listInvoices(request?: InvoiceListRequest): Promise<ListResponse<Invoice>> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createRefund(request: CreateRefundRequest): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getRefund(id: string): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listRefunds(paymentId?: string): Promise<Refund[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getDispute(id: string): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listDisputes(): Promise<Dispute[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateDispute(id: string, evidence: any): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async trackUsage(metrics: UsageMetrics): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async trackAIUsage(metrics: AIUsageMetrics): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getUsageMetrics(customerId: string, featureId: string, period: string): Promise<UsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getAIUsageMetrics(customerId: string, modelId?: string, period?: string): Promise<AIUsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async configure(options: Record<string, any>): Promise<void> {
    // Stripe configuration is handled in constructor
  }

  async batchCreateCustomers(requests: CreateCustomerRequest[]): Promise<Customer[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async batchCreatePaymentIntents(requests: CreatePaymentIntentRequest[]): Promise<PaymentIntent[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createWebhookEndpoint(url: string, events: string[]): Promise<string> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateWebhookEndpoint(id: string, url: string, events: string[]): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async deleteWebhookEndpoint(id: string): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listWebhookEndpoints(): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }
}
