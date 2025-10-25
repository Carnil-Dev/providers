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

  async init(_config: Record<string, any>): Promise<void> {
    // Initialization is handled in constructor
  }

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

  async retrieveCustomer(_params: any): Promise<Customer> {
    return this.getCustomer(_params.id || _params);
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

  async listCustomers(_request?: any): Promise<Customer[]> {
    try {
      const params: Stripe.CustomerListParams = {
        limit: _request?.limit || 10,
        starting_after: _request?.startingAfter,
        ending_before: _request?.endingBefore,
      };

      if (_request?.email) {
        params.email = _request.email;
      }

      if (_request?.created) {
        params.created = {
          gte: _request.created.gte?.getTime() / 1000,
          lte: _request.created.lte?.getTime() / 1000,
        };
      }

      const customers = await this.stripe.customers.list(params);

      return customers.data.map(customer => this.mapStripeCustomer(customer));
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async createPaymentMethod(_params: any): Promise<PaymentMethod> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrievePaymentMethod(_params: any): Promise<PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(_params.id || _params);
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw createProviderError('stripe', error);
    }
  }

  async updatePaymentMethod(_id: string, _params: any): Promise<PaymentMethod> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    await this.detachPaymentMethod(paymentMethodId);
  }

  async listPaymentMethods(_params?: any): Promise<PaymentMethod[]> {
    try {
      const customerId = _params?.customerId || _params?.customer || _params;
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
  // Product Provider Implementation
  // ========================================================================

  async createProduct(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveProduct(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateProduct(_id: string, _params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listProducts(_params?: any): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  // ========================================================================
  // Price Provider Implementation
  // ========================================================================

  async createPrice(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrievePrice(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updatePrice(_id: string, _params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listPrices(_params?: any): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
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

  async retrievePaymentIntent(_params: any): Promise<PaymentIntent> {
    return this.getPaymentIntent(_params.id || _params);
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

  async listPaymentIntents(_request?: any): Promise<PaymentIntent[]> {
    try {
      const params: Stripe.PaymentIntentListParams = {
        limit: _request?.limit || 10,
        starting_after: _request?.startingAfter,
        ending_before: _request?.endingBefore,
        customer: _request?.customerId,
      };

      if (_request?.created) {
        params.created = {
          gte: _request.created.gte?.getTime() / 1000,
          lte: _request.created.lte?.getTime() / 1000,
        };
      }

      const paymentIntents = await this.stripe.paymentIntents.list(params);

      return paymentIntents.data.map(pi => this.mapStripePaymentIntent(pi));
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
      metadata: paymentMethod.metadata || undefined,
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
      metadata: paymentIntent.metadata || undefined,
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

  async createSubscription(_request: any): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveSubscription(_params: any): Promise<Subscription> {
    return this.getSubscription(_params.id || _params);
  }

  async getSubscription(_id: string): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateSubscription(_id: string, _updates: any): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async cancelSubscription(_id: string): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listSubscriptions(_request?: any): Promise<Subscription[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createInvoice(_request: any): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveInvoice(_params: any): Promise<Invoice> {
    return this.getInvoice(_params.id || _params);
  }

  async getInvoice(_id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateInvoice(_id: string, _updates: any): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async finalizeInvoice(_id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async payInvoice(_id: string, _paymentMethodId?: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listInvoices(_request?: any): Promise<Invoice[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createRefund(_request: any): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveRefund(_params: any): Promise<Refund> {
    return this.getRefund(_params.id || _params);
  }

  async getRefund(_id: string): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listRefunds(_params?: any): Promise<Refund[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveDispute(_params: any): Promise<Dispute> {
    return this.getDispute(_params.id || _params);
  }

  async getDispute(_id: string): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listDisputes(_params?: any): Promise<Dispute[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateDispute(_id: string, _evidence: any): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async trackUsage(_metrics: UsageMetrics): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async trackAIUsage(_metrics: AIUsageMetrics): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getUsageMetrics(_customerId: string, _featureId: string, _period: string): Promise<UsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getAIUsageMetrics(_customerId: string, _modelId?: string, _period?: string): Promise<AIUsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async configure(_options: Record<string, any>): Promise<void> {
    // Stripe configuration is handled in constructor
  }

  async batchCreateCustomers(_requests: CreateCustomerRequest[]): Promise<Customer[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async batchCreatePaymentIntents(_requests: CreatePaymentIntentRequest[]): Promise<PaymentIntent[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createWebhookEndpoint(_url: string, _events: string[]): Promise<string> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateWebhookEndpoint(_id: string, _url: string, _events: string[]): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async deleteWebhookEndpoint(_id: string): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listWebhookEndpoints(): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }
}
