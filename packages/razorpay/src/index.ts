// ============================================================================
// Razorpay Provider for Carnil Payments SDK
// ============================================================================

export { RazorpayProvider } from './provider';

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
export function createRazorpayProvider(config: ProviderConfig) {
  return new RazorpayProvider(config);
}

// Register provider with Carnil
import { Carnil } from '@carnil/core';
import { RazorpayProvider } from './provider';

Carnil.registerProvider('razorpay', {
  create: (config: ProviderConfig) => new RazorpayProvider(config),
});
