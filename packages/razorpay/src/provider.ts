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
  WebhookEvent,
  UsageMetrics,
  AIUsageMetrics,
  ProviderConfig,
  ListPaymentMethodsParams,
  ListRefundsParams,
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
    'inr',
    'usd',
    'eur',
    'gbp',
    'aud',
    'cad',
    'sgd',
    'hkd',
    'jpy',
    'aed',
    'sar',
    'qar',
    'kwd',
    'bhd',
    'omr',
    'jod',
    'lbp',
    'egp',
    'try',
    'rub',
    'uah',
    'byn',
    'kzt',
    'uzs',
    'kgs',
    'tjs',
    'amd',
    'azn',
    'gel',
    'mdl',
    'bam',
    'mkd',
    'rsd',
    'mnt',
    'krw',
    'twd',
    'thb',
    'vnd',
    'idr',
    'myr',
    'php',
    'lkr',
    'bdt',
    'pkr',
    'afn',
    'npr',
    'btc',
    'eth',
    'ltc',
  ];
  public readonly supportedCountries = [
    'IN',
    'US',
    'CA',
    'GB',
    'AU',
    'AT',
    'BE',
    'BG',
    'BR',
    'CH',
    'CY',
    'CZ',
    'DE',
    'DK',
    'EE',
    'ES',
    'FI',
    'FR',
    'GR',
    'HR',
    'HU',
    'IE',
    'IT',
    'JP',
    'LI',
    'LT',
    'LU',
    'LV',
    'MT',
    'MX',
    'MY',
    'NL',
    'NO',
    'NZ',
    'PL',
    'PT',
    'RO',
    'SE',
    'SG',
    'SI',
    'SK',
    'TH',
    'ID',
    'PH',
    'VN',
    'KR',
    'TW',
    'HK',
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
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  async parseWebhook(payload: string, _signature: string, _secret: string): Promise<WebhookEvent> {
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
      });

      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async deleteCustomer(_id: string): Promise<void> {
    try {
      // Razorpay doesn't have a direct delete method for customers
      // We'll mark them as inactive by updating their status
      // Razorpay doesn't support customer deletion, so we'll just return success
      // In a real implementation, you might want to mark the customer as inactive in your database
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listCustomers(request?: CustomerListRequest): Promise<Customer[]> {
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

      return customers.items.map(customer => this.mapRazorpayCustomer(customer));
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listPaymentMethods(_params?: ListPaymentMethodsParams): Promise<PaymentMethod[]> {
    try {
      // Razorpay doesn't have a direct way to list payment methods for a customer
      // We'll return an empty array for now
      return [];
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async attachPaymentMethod(_customerId: string, _paymentMethodId: string): Promise<PaymentMethod> {
    try {
      // Razorpay doesn't have a direct way to attach payment methods
      // This would typically be handled through their payment flow
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async detachPaymentMethod(_paymentMethodId: string): Promise<void> {
    try {
      // Razorpay doesn't have a direct way to detach payment methods
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async setDefaultPaymentMethod(
    _customerId: string,
    _paymentMethodId: string
  ): Promise<PaymentMethod> {
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

  async updatePaymentIntent(
    _id: string,
    _updates: Partial<CreatePaymentIntentRequest>
  ): Promise<PaymentIntent> {
    try {
      // Razorpay orders cannot be updated once created
      throw new CarnilError('Orders cannot be updated in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async cancelPaymentIntent(_id: string): Promise<PaymentIntent> {
    try {
      // Razorpay orders cannot be cancelled once created
      throw new CarnilError('Orders cannot be cancelled in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async confirmPaymentIntent(id: string, _paymentMethodId?: string): Promise<PaymentIntent> {
    try {
      // In Razorpay, payment confirmation is handled on the frontend
      // We'll return the order details for frontend integration
      const order = await this.razorpay.orders.fetch(id);
      return this.mapRazorpayOrder(order);
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async capturePaymentIntent(_id: string, _amount?: number): Promise<PaymentIntent> {
    try {
      // Razorpay doesn't have a separate capture step
      throw new CarnilError('Not supported in Razorpay', 'NOT_SUPPORTED');
    } catch (error) {
      throw createProviderError('razorpay', error);
    }
  }

  async listPaymentIntents(request?: PaymentIntentListRequest): Promise<PaymentIntent[]> {
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

      return orders.items.map(order => this.mapRazorpayOrder(order));
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

  async createSubscription(_request: CreateSubscriptionRequest): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getSubscription(_id: string): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateSubscription(
    _id: string,
    _updates: Partial<CreateSubscriptionRequest>
  ): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async cancelSubscription(_id: string, _immediately?: boolean): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listSubscriptions(_request?: SubscriptionListRequest): Promise<Subscription[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createInvoice(_request: CreateInvoiceRequest): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getInvoice(_id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateInvoice(_id: string, _updates: Partial<CreateInvoiceRequest>): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async finalizeInvoice(_id: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async payInvoice(_id: string, _paymentMethodId?: string): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listInvoices(_request?: InvoiceListRequest): Promise<Invoice[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createRefund(_request: CreateRefundRequest): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getRefund(_id: string): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listRefunds(_params?: ListRefundsParams): Promise<Refund[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getDispute(_id: string): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listDisputes(): Promise<Dispute[]> {
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

  async getUsageMetrics(
    _customerId: string,
    _featureId: string,
    _period: string
  ): Promise<UsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async getAIUsageMetrics(
    _customerId: string,
    _modelId?: string,
    _period?: string
  ): Promise<AIUsageMetrics[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async configure(_options: Record<string, any>): Promise<void> {
    // Razorpay configuration is handled in constructor
  }

  async batchCreateCustomers(_requests: CreateCustomerRequest[]): Promise<Customer[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async batchCreatePaymentIntents(
    _requests: CreatePaymentIntentRequest[]
  ): Promise<PaymentIntent[]> {
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

  // Missing interface methods
  async init(): Promise<void> {
    // Razorpay initialization is done in constructor
  }

  async retrieveCustomer(_params: any): Promise<Customer> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async createPaymentMethod(_params: any): Promise<PaymentMethod> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrievePaymentMethod(_params: any): Promise<PaymentMethod> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updatePaymentMethod(_id: string, _updates: any): Promise<PaymentMethod> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async deletePaymentMethod(_id: string): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrievePaymentIntent(_params: any): Promise<PaymentIntent> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveSubscription(_params: any): Promise<Subscription> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveInvoice(_params: any): Promise<Invoice> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveRefund(_params: any): Promise<Refund> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveDispute(_params: any): Promise<Dispute> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  // Product management methods
  async createProduct(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrieveProduct(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updateProduct(_id: string, _updates: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listProducts(_params?: any): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async deleteProduct(_id: string): Promise<void> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  // Price management methods
  async createPrice(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async retrievePrice(_params: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async updatePrice(_id: string, _updates: any): Promise<any> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }

  async listPrices(_params?: any): Promise<any[]> {
    throw new CarnilError('Not implemented', 'NOT_IMPLEMENTED');
  }
}
