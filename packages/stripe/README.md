# @carnil/stripe

[![npm version](https://badge.fury.io/js/%40carnil%2Fstripe.svg)](https://badge.fury.io/js/%40carnil%2Fstripe)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Stripe provider for Carnil unified payments platform. This package provides a complete integration with Stripe's payment processing capabilities, including payments, subscriptions, customers, and webhooks.

## Features

- 💳 **Payment Processing** - Complete payment intent management
- 👥 **Customer Management** - Customer creation and management
- 🔄 **Subscription Handling** - Recurring billing and subscriptions
- 📄 **Invoice Management** - Invoice creation and management
- 💰 **Refund Processing** - Full and partial refunds
- 🔔 **Webhook Support** - Secure webhook verification and parsing
- 📊 **Analytics** - Usage tracking and analytics
- 🛡️ **Security** - PCI DSS compliant payment processing

## Installation

```bash
npm install @carnil/stripe
```

## Peer Dependencies

```bash
npm install stripe@^14.0.0
```

## Quick Start

```typescript
import { StripeProvider } from '@carnil/stripe';
import { Carnil } from '@carnil/core';

// Register the Stripe provider
Carnil.registerProvider('stripe', StripeProvider);

// Initialize Carnil with Stripe
const carnil = new Carnil({
  provider: {
    provider: 'stripe',
    apiKey: 'sk_test_...',
    webhookSecret: 'whsec_...'
  },
  debug: true
});

// Create a customer
const customer = await carnil.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe'
});

// Create a payment intent
const paymentIntent = await carnil.createPaymentIntent({
  amount: 2000, // $20.00
  currency: 'usd',
  customerId: customer.data.id
});
```

## API Reference

### StripeProvider Class

```typescript
class StripeProvider implements CarnilProvider {
  constructor(config: StripeConfig);
  
  // Customer operations
  createCustomer(request: CreateCustomerRequest): Promise<Customer>;
  retrieveCustomer(request: RetrieveCustomerRequest): Promise<Customer>;
  updateCustomer(id: string, request: UpdateCustomerRequest): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  listCustomers(request?: CustomerListRequest): Promise<ListResponse<Customer>>;
  
  // Payment method operations
  listPaymentMethods(request: ListPaymentMethodsRequest): Promise<PaymentMethod[]>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod>;
  detachPaymentMethod(paymentMethodId: string): Promise<void>;
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<PaymentMethod>;
  
  // Payment intent operations
  createPaymentIntent(request: CreatePaymentIntentRequest): Promise<PaymentIntent>;
  getPaymentIntent(id: string): Promise<PaymentIntent>;
  updatePaymentIntent(id: string, updates: Partial<CreatePaymentIntentRequest>): Promise<PaymentIntent>;
  cancelPaymentIntent(id: string): Promise<PaymentIntent>;
  confirmPaymentIntent(id: string, paymentMethodId?: string): Promise<PaymentIntent>;
  capturePaymentIntent(id: string, amount?: number): Promise<PaymentIntent>;
  listPaymentIntents(request?: PaymentIntentListRequest): Promise<ListResponse<PaymentIntent>>;
  
  // Subscription operations
  createSubscription(request: CreateSubscriptionRequest): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<CreateSubscriptionRequest>): Promise<Subscription>;
  cancelSubscription(id: string): Promise<Subscription>;
  listSubscriptions(request?: SubscriptionListRequest): Promise<ListResponse<Subscription>>;
  
  // Invoice operations
  createInvoice(request: CreateInvoiceRequest): Promise<Invoice>;
  getInvoice(id: string): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<CreateInvoiceRequest>): Promise<Invoice>;
  finalizeInvoice(id: string): Promise<Invoice>;
  payInvoice(id: string, paymentMethodId?: string): Promise<Invoice>;
  listInvoices(request?: InvoiceListRequest): Promise<ListResponse<Invoice>>;
  
  // Refund operations
  createRefund(request: CreateRefundRequest): Promise<Refund>;
  getRefund(id: string): Promise<Refund>;
  listRefunds(request: ListRefundsRequest): Promise<Refund[]>;
  
  // Webhook operations
  verifyWebhook(payload: string, signature: string, secret: string): Promise<boolean>;
  parseWebhook(payload: string, signature: string, secret: string): Promise<WebhookEvent>;
  
  // Analytics operations
  trackUsage(metrics: UsageMetrics): Promise<void>;
  trackAIUsage(metrics: AIUsageMetrics): Promise<void>;
  getUsageMetrics(customerId: string, featureId: string, period: string): Promise<UsageMetrics[]>;
  getAIUsageMetrics(customerId: string, modelId?: string, period?: string): Promise<AIUsageMetrics[]>;
  
  // Health check
  healthCheck(): Promise<boolean>;
}
```

## Configuration

### StripeConfig

```typescript
interface StripeConfig {
  apiKey: string;
  webhookSecret?: string;
  apiVersion?: string;
  maxNetworkRetries?: number;
  timeout?: number;
  telemetry?: boolean;
}
```

### Environment Variables

```bash
# Stripe Configuration
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# For production
STRIPE_API_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Customer Management

### Creating Customers

```typescript
import { StripeProvider } from '@carnil/stripe';

const stripeProvider = new StripeProvider({
  apiKey: process.env.STRIPE_API_KEY!
});

// Create a customer
const customer = await stripeProvider.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  metadata: {
    source: 'website',
    plan: 'premium'
  }
});

console.log('Customer created:', customer.id);
```

### Managing Customers

```typescript
// Get customer
const customer = await stripeProvider.retrieveCustomer({ id: 'cus_123' });

// Update customer
const updatedCustomer = await stripeProvider.updateCustomer('cus_123', {
  name: 'Jane Doe',
  metadata: {
    plan: 'enterprise'
  }
});

// List customers
const customers = await stripeProvider.listCustomers({
  limit: 10,
  email: 'customer@example.com'
});

// Delete customer
await stripeProvider.deleteCustomer('cus_123');
```

## Payment Processing

### Payment Intents

```typescript
// Create payment intent
const paymentIntent = await stripeProvider.createPaymentIntent({
  amount: 2000, // $20.00
  currency: 'usd',
  customerId: 'cus_123',
  paymentMethodId: 'pm_123',
  metadata: {
    orderId: 'order_123'
  }
});

// Confirm payment intent
const confirmedIntent = await stripeProvider.confirmPaymentIntent('pi_123', 'pm_123');

// Capture payment intent
const capturedIntent = await stripeProvider.capturePaymentIntent('pi_123', 2000);

// Cancel payment intent
const cancelledIntent = await stripeProvider.cancelPaymentIntent('pi_123');
```

### Payment Methods

```typescript
// List payment methods
const paymentMethods = await stripeProvider.listPaymentMethods({ customerId: 'cus_123' });

// Attach payment method
const paymentMethod = await stripeProvider.attachPaymentMethod('cus_123', 'pm_123');

// Set default payment method
const defaultMethod = await stripeProvider.setDefaultPaymentMethod('cus_123', 'pm_123');

// Detach payment method
await stripeProvider.detachPaymentMethod('pm_123');
```

## Subscriptions

### Creating Subscriptions

```typescript
// Create subscription
const subscription = await stripeProvider.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_123',
  paymentMethodId: 'pm_123',
  metadata: {
    plan: 'premium'
  }
});

console.log('Subscription created:', subscription.id);
```

### Managing Subscriptions

```typescript
// Get subscription
const subscription = await stripeProvider.getSubscription('sub_123');

// Update subscription
const updatedSubscription = await stripeProvider.updateSubscription('sub_123', {
  priceId: 'price_456',
  metadata: {
    plan: 'enterprise'
  }
});

// Cancel subscription
const cancelledSubscription = await stripeProvider.cancelSubscription('sub_123');

// List subscriptions
const subscriptions = await stripeProvider.listSubscriptions({
  customerId: 'cus_123',
  status: 'active'
});
```

## Invoices

### Invoice Management

```typescript
// Create invoice
const invoice = await stripeProvider.createInvoice({
  customerId: 'cus_123',
  items: [
    {
      priceId: 'price_123',
      quantity: 1
    }
  ],
  metadata: {
    orderId: 'order_123'
  }
});

// Finalize invoice
const finalizedInvoice = await stripeProvider.finalizeInvoice('in_123');

// Pay invoice
const paidInvoice = await stripeProvider.payInvoice('in_123', 'pm_123');

// List invoices
const invoices = await stripeProvider.listInvoices({
  customerId: 'cus_123',
  status: 'paid'
});
```

## Refunds

### Refund Processing

```typescript
// Create refund
const refund = await stripeProvider.createRefund({
  paymentId: 'pi_123',
  amount: 1000, // $10.00
  reason: 'requested_by_customer',
  metadata: {
    reason: 'defective_product'
  }
});

// Get refund
const refundDetails = await stripeProvider.getRefund('re_123');

// List refunds
const refunds = await stripeProvider.listRefunds({ paymentId: 'pi_123' });
```

## Webhooks

### Webhook Verification

```typescript
import { StripeProvider } from '@carnil/stripe';

const stripeProvider = new StripeProvider({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
});

// Verify webhook signature
const isValid = await stripeProvider.verifyWebhook(payload, signature, secret);
if (isValid) {
  console.log('Webhook signature is valid');
}

// Parse webhook payload
const event = await stripeProvider.parseWebhook(payload, signature, secret);
console.log('Webhook event:', event.type, event.data);
```

### Express.js Webhook Handler

```typescript
import express from 'express';
import { StripeProvider } from '@carnil/stripe';

const app = express();
const stripeProvider = new StripeProvider({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
});

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = req.body;
    
    // Verify webhook
    const isValid = await stripeProvider.verifyWebhook(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Parse event
    const event = await stripeProvider.parseWebhook(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    
    // Handle event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Next.js API Route

```typescript
// pages/api/webhooks/stripe.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { StripeProvider } from '@carnil/stripe';

const stripeProvider = new StripeProvider({
  apiKey: process.env.STRIPE_API_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify webhook
    const isValid = await stripeProvider.verifyWebhook(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Parse event
    const event = await stripeProvider.parseWebhook(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    
    // Handle event
    await handleWebhookEvent(event);
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Analytics

### Usage Tracking

```typescript
// Track usage
await stripeProvider.trackUsage({
  customerId: 'cus_123',
  featureId: 'api_calls',
  usage: 100,
  timestamp: new Date()
});

// Track AI usage
await stripeProvider.trackAIUsage({
  customerId: 'cus_123',
  modelId: 'gpt-4',
  tokens: 1000,
  cost: 0.02
});

// Get usage metrics
const metrics = await stripeProvider.getUsageMetrics('cus_123', 'api_calls', 'month');

// Get AI usage metrics
const aiMetrics = await stripeProvider.getAIUsageMetrics('cus_123', 'gpt-4', 'month');
```

## Error Handling

### Stripe-Specific Errors

```typescript
import { StripeProvider } from '@carnil/stripe';
import { StripeError } from 'stripe';

try {
  const paymentIntent = await stripeProvider.createPaymentIntent({
    amount: 2000,
    currency: 'usd'
  });
} catch (error) {
  if (error instanceof StripeError) {
    switch (error.type) {
      case 'card_error':
        console.error('Card error:', error.message);
        break;
      case 'rate_limit_error':
        console.error('Rate limit exceeded:', error.message);
        break;
      case 'invalid_request_error':
        console.error('Invalid request:', error.message);
        break;
      case 'authentication_error':
        console.error('Authentication failed:', error.message);
        break;
      case 'api_connection_error':
        console.error('API connection error:', error.message);
        break;
      case 'api_error':
        console.error('API error:', error.message);
        break;
      default:
        console.error('Unknown error:', error.message);
    }
  }
}
```

## Testing

### Test Mode

```typescript
// Use test API key for testing
const stripeProvider = new StripeProvider({
  apiKey: 'sk_test_...',
  webhookSecret: 'whsec_...'
});

// Test payment intent creation
const testPaymentIntent = await stripeProvider.createPaymentIntent({
  amount: 2000,
  currency: 'usd',
  paymentMethodId: 'pm_card_visa' // Test card
});
```

### Webhook Testing

```typescript
// Test webhook verification
const testPayload = JSON.stringify({
  id: 'evt_test_webhook',
  object: 'event',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test_123',
      amount: 2000,
      currency: 'usd'
    }
  }
});

const testSignature = 't=1234567890,v1=test_signature';
const isValid = await stripeProvider.verifyWebhook(testPayload, testSignature, 'whsec_test_...');
```

## Health Check

```typescript
// Check Stripe API health
const isHealthy = await stripeProvider.healthCheck();
if (isHealthy) {
  console.log('Stripe API is healthy');
} else {
  console.log('Stripe API is not responding');
}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Carnil-Dev/carnil-sdk/blob/main/CONTRIBUTING.md) for details.

## License

MIT © [Carnil Team](https://carnil.dev)

## Support

- 📖 [Documentation](https://docs.carnil.dev)
- 💬 [Discord Community](https://discord.gg/carnil)
- 🐛 [Report Issues](https://github.com/Carnil-Dev/carnil-sdk/issues)
- 📧 [Email Support](mailto:hello@carnil.dev)
