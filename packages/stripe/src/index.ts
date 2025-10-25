// ============================================================================
// Stripe Provider for Carnil Payments SDK
// ============================================================================

export { StripeProvider } from './provider';

// Re-export core types for convenience
export type {
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

// Provider factory function
export function createStripeProvider(config: ProviderConfig) {
  return new StripeProvider(config);
}

// Register provider with Carnil
import { Carnil } from '@carnil/core';
import { StripeProvider } from './provider';

Carnil.registerProvider('stripe', {
  create: (config: ProviderConfig) => new StripeProvider(config),
});
