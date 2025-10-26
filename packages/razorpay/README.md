# @carnil/razorpay

[![npm version](https://badge.fury.io/js/%40carnil%2Frazorpay.svg)](https://badge.fury.io/js/%40carnil%2Frazorpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Razorpay provider for Carnil unified payments platform. This package provides a complete integration with Razorpay's payment processing capabilities, including payments, subscriptions, customers, and webhooks for the Indian market.

## Features

- 💳 **Payment Processing** - Complete payment intent management
- 👥 **Customer Management** - Customer creation and management
- 🔄 **Subscription Handling** - Recurring billing and subscriptions
- 📄 **Invoice Management** - Invoice creation and management
- 💰 **Refund Processing** - Full and partial refunds
- 🔔 **Webhook Support** - Secure webhook verification and parsing
- 📊 **Analytics** - Usage tracking and analytics
- 🇮🇳 **India Focus** - Optimized for Indian payment methods and regulations

## Installation

```bash
npm install @carnil/razorpay
```

## Peer Dependencies

```bash
npm install razorpay@^2.9.0
```

## Quick Start

```typescript
import { RazorpayProvider } from '@carnil/razorpay';
import { Carnil } from '@carnil/core';

// Register the Razorpay provider
Carnil.registerProvider('razorpay', RazorpayProvider);

// Initialize Carnil with Razorpay
const carnil = new Carnil({
  provider: {
    provider: 'razorpay',
    keyId: 'rzp_test_...',
    keySecret: 'your_key_secret',
    webhookSecret: 'your_webhook_secret'
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
  amount: 200000, // ₹2000.00 (amount in paise)
  currency: 'INR',
  customerId: customer.data.id
});
```

## API Reference

### RazorpayProvider Class

```typescript
class RazorpayProvider implements CarnilProvider {
  constructor(config: RazorpayConfig);
  
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

### RazorpayConfig

```typescript
interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
  environment?: 'test' | 'live';
}
```

### Environment Variables

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# For production
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_live_key_secret
RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret
```

## Customer Management

### Creating Customers

```typescript
import { RazorpayProvider } from '@carnil/razorpay';

const razorpayProvider = new RazorpayProvider({
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!
});

// Create a customer
const customer = await razorpayProvider.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  contact: '+919876543210',
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
const customer = await razorpayProvider.retrieveCustomer({ id: 'cust_123' });

// Update customer
const updatedCustomer = await razorpayProvider.updateCustomer('cust_123', {
  name: 'Jane Doe',
  contact: '+919876543211',
  metadata: {
    plan: 'enterprise'
  }
});

// List customers
const customers = await razorpayProvider.listCustomers({
  limit: 10,
  email: 'customer@example.com'
});

// Delete customer
await razorpayProvider.deleteCustomer('cust_123');
```

## Payment Processing

### Payment Intents

```typescript
// Create payment intent
const paymentIntent = await razorpayProvider.createPaymentIntent({
  amount: 200000, // ₹2000.00 (amount in paise)
  currency: 'INR',
  customerId: 'cust_123',
  paymentMethodId: 'pm_123',
  notes: {
    orderId: 'order_123'
  }
});

// Confirm payment intent
const confirmedIntent = await razorpayProvider.confirmPaymentIntent('pay_123', 'pm_123');

// Capture payment intent
const capturedIntent = await razorpayProvider.capturePaymentIntent('pay_123', 200000);

// Cancel payment intent
const cancelledIntent = await razorpayProvider.cancelPaymentIntent('pay_123');
```

### Payment Methods

```typescript
// List payment methods
const paymentMethods = await razorpayProvider.listPaymentMethods({ customerId: 'cust_123' });

// Attach payment method
const paymentMethod = await razorpayProvider.attachPaymentMethod('cust_123', 'pm_123');

// Set default payment method
const defaultMethod = await razorpayProvider.setDefaultPaymentMethod('cust_123', 'pm_123');

// Detach payment method
await razorpayProvider.detachPaymentMethod('pm_123');
```

## Subscriptions

### Creating Subscriptions

```typescript
// Create subscription
const subscription = await razorpayProvider.createSubscription({
  customerId: 'cust_123',
  planId: 'plan_123',
  paymentMethodId: 'pm_123',
  notes: {
    plan: 'premium'
  }
});

console.log('Subscription created:', subscription.id);
```

### Managing Subscriptions

```typescript
// Get subscription
const subscription = await razorpayProvider.getSubscription('sub_123');

// Update subscription
const updatedSubscription = await razorpayProvider.updateSubscription('sub_123', {
  planId: 'plan_456',
  notes: {
    plan: 'enterprise'
  }
});

// Cancel subscription
const cancelledSubscription = await razorpayProvider.cancelSubscription('sub_123');

// List subscriptions
const subscriptions = await razorpayProvider.listSubscriptions({
  customerId: 'cust_123',
  status: 'active'
});
```

## Invoices

### Invoice Management

```typescript
// Create invoice
const invoice = await razorpayProvider.createInvoice({
  customerId: 'cust_123',
  items: [
    {
      name: 'Premium Plan',
      amount: 200000,
      currency: 'INR',
      quantity: 1
    }
  ],
  notes: {
    orderId: 'order_123'
  }
});

// Finalize invoice
const finalizedInvoice = await razorpayProvider.finalizeInvoice('inv_123');

// Pay invoice
const paidInvoice = await razorpayProvider.payInvoice('inv_123', 'pm_123');

// List invoices
const invoices = await razorpayProvider.listInvoices({
  customerId: 'cust_123',
  status: 'paid'
});
```

## Refunds

### Refund Processing

```typescript
// Create refund
const refund = await razorpayProvider.createRefund({
  paymentId: 'pay_123',
  amount: 100000, // ₹1000.00 (amount in paise)
  notes: {
    reason: 'defective_product'
  }
});

// Get refund
const refundDetails = await razorpayProvider.getRefund('rfnd_123');

// List refunds
const refunds = await razorpayProvider.listRefunds({ paymentId: 'pay_123' });
```

## Webhooks

### Webhook Verification

```typescript
import { RazorpayProvider } from '@carnil/razorpay';

const razorpayProvider = new RazorpayProvider({
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!
});

// Verify webhook signature
const isValid = await razorpayProvider.verifyWebhook(payload, signature, secret);
if (isValid) {
  console.log('Webhook signature is valid');
}

// Parse webhook payload
const event = await razorpayProvider.parseWebhook(payload, signature, secret);
console.log('Webhook event:', event.type, event.data);
```

### Express.js Webhook Handler

```typescript
import express from 'express';
import { RazorpayProvider } from '@carnil/razorpay';

const app = express();
const razorpayProvider = new RazorpayProvider({
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!
});

app.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = req.body;
    
    // Verify webhook
    const isValid = await razorpayProvider.verifyWebhook(payload, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Parse event
    const event = await razorpayProvider.parseWebhook(payload, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);
    
    // Handle event
    switch (event.type) {
      case 'payment.captured':
        await handlePaymentCaptured(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      case 'subscription.created':
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
// pages/api/webhooks/razorpay.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { RazorpayProvider } from '@carnil/razorpay';

const razorpayProvider = new RazorpayProvider({
  keyId: process.env.RAZORPAY_KEY_ID!,
  keySecret: process.env.RAZORPAY_KEY_SECRET!,
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify webhook
    const isValid = await razorpayProvider.verifyWebhook(payload, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Parse event
    const event = await razorpayProvider.parseWebhook(payload, signature, process.env.RAZORPAY_WEBHOOK_SECRET!);
    
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
await razorpayProvider.trackUsage({
  customerId: 'cust_123',
  featureId: 'api_calls',
  usage: 100,
  timestamp: new Date()
});

// Track AI usage
await razorpayProvider.trackAIUsage({
  customerId: 'cust_123',
  modelId: 'gpt-4',
  tokens: 1000,
  cost: 0.02
});

// Get usage metrics
const metrics = await razorpayProvider.getUsageMetrics('cust_123', 'api_calls', 'month');

// Get AI usage metrics
const aiMetrics = await razorpayProvider.getAIUsageMetrics('cust_123', 'gpt-4', 'month');
```

## Indian Payment Methods

### UPI Integration

```typescript
// Create UPI payment intent
const upiPaymentIntent = await razorpayProvider.createPaymentIntent({
  amount: 200000, // ₹2000.00
  currency: 'INR',
  method: 'upi',
  customerId: 'cust_123',
  notes: {
    upiId: 'customer@paytm'
  }
});
```

### Net Banking

```typescript
// Create net banking payment intent
const netBankingPaymentIntent = await razorpayProvider.createPaymentIntent({
  amount: 200000, // ₹2000.00
  currency: 'INR',
  method: 'netbanking',
  customerId: 'cust_123',
  notes: {
    bank: 'HDFC'
  }
});
```

### Wallet Integration

```typescript
// Create wallet payment intent
const walletPaymentIntent = await razorpayProvider.createPaymentIntent({
  amount: 200000, // ₹2000.00
  currency: 'INR',
  method: 'wallet',
  customerId: 'cust_123',
  notes: {
    wallet: 'paytm'
  }
});
```

## Error Handling

### Razorpay-Specific Errors

```typescript
import { RazorpayProvider } from '@carnil/razorpay';

try {
  const paymentIntent = await razorpayProvider.createPaymentIntent({
    amount: 200000,
    currency: 'INR'
  });
} catch (error) {
  if (error.code === 'BAD_REQUEST_ERROR') {
    console.error('Bad request:', error.message);
  } else if (error.code === 'GATEWAY_ERROR') {
    console.error('Gateway error:', error.message);
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

## Testing

### Test Mode

```typescript
// Use test credentials for testing
const razorpayProvider = new RazorpayProvider({
  keyId: 'rzp_test_...',
  keySecret: 'test_key_secret',
  webhookSecret: 'test_webhook_secret',
  environment: 'test'
});

// Test payment intent creation
const testPaymentIntent = await razorpayProvider.createPaymentIntent({
  amount: 200000,
  currency: 'INR',
  method: 'card'
});
```

### Webhook Testing

```typescript
// Test webhook verification
const testPayload = JSON.stringify({
  entity: 'event',
  account_id: 'acc_test',
  event: 'payment.captured',
  contains: ['payment'],
  payload: {
    payment: {
      entity: {
        id: 'pay_test_123',
        amount: 200000,
        currency: 'INR'
      }
    }
  }
});

const testSignature = 'test_signature';
const isValid = await razorpayProvider.verifyWebhook(testPayload, testSignature, 'test_webhook_secret');
```

## Health Check

```typescript
// Check Razorpay API health
const isHealthy = await razorpayProvider.healthCheck();
if (isHealthy) {
  console.log('Razorpay API is healthy');
} else {
  console.log('Razorpay API is not responding');
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
