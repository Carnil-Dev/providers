import Razorpay from 'razorpay';
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

export class RazorpayProvider implements CarnilProvider {
  public readonly name = 'razorpay';
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
    'inr', 'usd', 'eur', 'gbp', 'aud', 'cad', 'sgd', 'hkd', 'jpy', 'aed',
    'sar', 'qar', 'kwd', 'bhd', 'omr', 'jod', 'lbp', 'egp', 'try', 'rub',
    'uah', 'byn', 'kzt', 'uzs', 'kgs', 'tjs', 'amd', 'azn', 'gel', 'mdl',
    'bam', 'mkd', 'rsd', 'mnt', 'krw', 'twd', 'thb', 'vnd', 'idr', 'myr',
    'php', 'lkr', 'bdt', 'pkr', 'afn', 'npr', 'btc', 'eth', 'ltc',
  ];
  public readonly supportedCountries = [
    'IN', 'US', 'CA', 'GB', 'AU', 'AT', 'BE', 'BG', 'BR', 'CH', 'CY', 'CZ',
    'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT', 'JP',
    'LI', 'LT', 'LU', 'LV', 'MT', 'MX', 'MY', 'NL', 'NO', 'NZ', 'PL', 'PT',
    'RO', 'SE', 'SG', 'SI', 'SK', 'TH', 'ID', 'PH', 'VN', 'KR', 'TW', 'HK',
  ];

  private razorpay: Razorpay;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.razorpay = new Razorpay({
      key_id: config.apiKey,
      key_secret: config.apiKey, // Razorpay uses key_secret for API key
    });
  }

  // ========================================================================
  // Base Provider Implementation
  // ========================================================================

  async healthCheck(): Promise<boolean> {
    try {
      await this.razorpay.payments.fetch('dummy'); // This will fail but we can check if the client is initialized
      return true;
    } catch (error) {
      // If it's a 404, the client is working but the payment doesn't exist
      return (error as any).statusCode === 404;
    }
  }

  async verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  async parseWebhook(payload: string, signature: string, secret: string): Promise<WebhookEvent> {
    try {
      const event = JSON.parse(payload);
      return {
        id: event.id || event.entity,
        type: event.event,
        data: event.payload || event,
        created: new Date(event.created_at * 1000),
        provider: 'razorpay',
        livemode: !this.config.apiKey.startsWith('rzp_test_'),
      };
    } catch (error) {
      throw createProviderError('razorpay', error, 'Webhook parsing failed');
    }
  }

  // ========================================================================
  // Customer Provider Implementation
  // ========================================================================

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.razorpay.customers.create({
        name: request.name,
        email: request.email,
        contact: request.phone,
        notes: request.metadata,
      });

      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async getCustomer(id: string): Promise<Customer> {
    try {
      const customer = await this.razorpay.customers.fetch(id);
      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async updateCustomer(id: string, request: UpdateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.razorpay.customers.edit(id, {
        name: request.name,
        email: request.email,
        contact: request.phone,
        notes: request.metadata,
      });

      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      // Razorpay doesn't have a direct delete method for customers
      // We'll mark them as inactive by updating their status
      await this.razorpay.customers.edit(id, {
        notes: { status: 'inactive', deleted_at: new Date().toISOString() },
      });
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listCustomers(request?: CustomerListRequest): Promise<ListResponse<Customer>> {
    try {
      const params: any = {
        count: request?.limit || 10,
      };

      if (request?.startingAfter) {
        params.from = request.startingAfter;
      }

      if (request?.endingBefore) {
        params.to = request.endingBefore;
      }

      const customers = await this.razorpay.customers.all(params);

      return {
        data: customers.items.map(customer => this.mapRazorpayCustomer(customer)),
        hasMore: customers.count === (request?.limit || 10),
        totalCount: customers.count,
        nextCursor: customers.items[customers.items.length - 1]?.id,
        prevCursor: customers.items[0]?.id,
      };
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      // Razorpay doesn't have a direct way to list payment methods for a customer
      // We'll return an empty array for now
      return [];
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    try {
      // Razorpay doesn't have a direct way to attach payment methods
      // This would typically be handled through their payment flow
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      // Razorpay doesn't have a direct way to detach payment methods
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod> {
    try {
      // Razorpay doesn't have a direct way to set default payment methods
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  // ========================================================================
  // Payment Provider Implementation
  // ========================================================================

  async createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    try {
      // In Razorpay, we create an Order instead of a PaymentIntent
      const order = await this.razorpay.orders.create({
        amount: Math.round(request.amount * 100), // Convert to paise
        currency: request.currency,
        receipt: `receipt_${Date.now()}`,
        notes: request.metadata,
      });

      return this.mapRazorpayOrder(order, request.customerId);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    try {
      const order = await this.razorpay.orders.fetch(id);
      return this.mapRazorpayOrder(order);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async updatePaymentIntent(id: string, updates: Partial<CreatePaymentIntentRequest>): Promise<PaymentIntent> {
    try {
      // Razorpay orders cannot be updated once created
      throw new CarnilError('Orders cannot be updated in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async cancelPaymentIntent(id: string): Promise<PaymentIntent> {
    try {
      // Razorpay orders cannot be cancelled once created
      throw new CarnilError('Orders cannot be cancelled in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async confirmPaymentIntent(id: string, paymentMethodId?: string): Promise<PaymentIntent> {
    try {
      // In Razorpay, payment confirmation is handled on the frontend
      // We'll return the order details for frontend integration
      const order = await this.razorpay.orders.fetch(id);
      return this.mapRazorpayOrder(order);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async capturePaymentIntent(id: string, amount?: number): Promise<PaymentIntent> {
    try {
      // Razorpay doesn't have a separate capture step
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listPaymentIntents(request?: PaymentIntentListRequest): Promise<ListResponse<PaymentIntent>> {
    try {
      const params: any = {
        count: request?.limit || 10,
      };

      if (request?.startingAfter) {
        params.from = request.startingAfter;
      }

      if (request?.endingBefore) {
        params.to = request.endingBefore;
      }

      const orders = await this.razorpay.orders.all(params);

      return {
        data: orders.items.map(order => this.mapRazorpayOrder(order)),
        hasMore: orders.count === (request?.limit || 10),
        totalCount: orders.count,
        nextCursor: orders.items[orders.items.length - 1]?.id,
        prevCursor: orders.items[0]?.id,
      };
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  // ========================================================================
  // Mapping Functions
  // ========================================================================

  private mapRazorpayCustomer(customer: any): Customer {
    return {
      id: customer.id,
      email: customer.email || undefined,
      name: customer.name || undefined,
      phone: customer.contact || undefined,
      description: undefined,
      metadata: customer.notes || {},
      created: new Date(customer.created_at * 1000),
      updated: new Date(customer.created_at * 1000), // Razorpay doesn't track updated time
      deleted: customer.notes?.status === 'inactive',
      provider: 'razorpay',
      providerId: customer.id,
    };
  }

  private mapRazorpayOrder(order: any, customerId?: string): PaymentIntent {
    return {
      id: order.id,
      customerId: customerId || '',
      amount: order.amount / 100, // Convert from paise
      currency: order.currency,
      status: this.mapRazorpayOrderStatus(order.status),
      clientSecret: order.id, // In Razorpay, the order ID is used for frontend integration
      description: order.receipt || undefined,
      metadata: order.notes || {},
      paymentMethodId: undefined,
      receiptEmail: undefined,
      created: new Date(order.created_at * 1000),
      updated: new Date(order.created_at * 1000),
      provider: 'razorpay',
      providerId: order.id,
    };
  }

  private mapRazorpayOrderStatus(status: string): PaymentIntent['status'] {
    switch (status) {
      case 'created':
        return 'requires_payment_method';
      case 'attempted':
        return 'processing';
      case 'paid':
        return 'succeeded';
      case 'failed':
        return 'failed';
      default:
        return 'requires_payment_method';
    }
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
    // Razorpay configuration is handled in constructor
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
