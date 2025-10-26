'use strict';

var Stripe = require('stripe');
var core = require('@carnil/core');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var Stripe__default = /*#__PURE__*/_interopDefault(Stripe);

// src/provider.ts
var StripeProvider = class {
  constructor(config) {
    this.name = "stripe";
    this.version = "1.0.0";
    this.supportedFeatures = [
      "customers",
      "payments",
      "subscriptions",
      "invoices",
      "refunds",
      "disputes",
      "webhooks",
      "analytics"
    ];
    this.supportedCurrencies = [
      "usd",
      "eur",
      "gbp",
      "cad",
      "aud",
      "jpy",
      "chf",
      "sek",
      "nok",
      "dkk",
      "pln",
      "czk",
      "huf",
      "bgn",
      "hrk",
      "ron",
      "try",
      "rub",
      "uah",
      "byn",
      "kzt",
      "uzs",
      "kgs",
      "tjs",
      "amd",
      "azn",
      "gel",
      "mdl",
      "bam",
      "mkd",
      "rsd",
      "mnt",
      "krw",
      "sgd",
      "hkd",
      "twd",
      "thb",
      "vnd",
      "idr",
      "myr",
      "php",
      "inr",
      "lkr",
      "bdt",
      "pkr",
      "afn",
      "npr",
      "btc",
      "eth",
      "ltc"
    ];
    this.supportedCountries = [
      "US",
      "CA",
      "GB",
      "AU",
      "AT",
      "BE",
      "BG",
      "BR",
      "CH",
      "CY",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GR",
      "HR",
      "HU",
      "IE",
      "IT",
      "JP",
      "LI",
      "LT",
      "LU",
      "LV",
      "MT",
      "MX",
      "MY",
      "NL",
      "NO",
      "NZ",
      "PL",
      "PT",
      "RO",
      "SE",
      "SG",
      "SI",
      "SK",
      "TH",
      "IN",
      "ID",
      "PH",
      "VN",
      "KR",
      "TW",
      "HK"
    ];
    this.config = config;
    this.stripe = new Stripe__default.default(config.apiKey, {
      apiVersion: "2023-10-16",
      timeout: config.timeout || 3e4,
      maxNetworkRetries: config.retries || 3
    });
  }
  // ========================================================================
  // Base Provider Implementation
  // ========================================================================
  async init(_config) {
  }
  async healthCheck() {
    try {
      await this.stripe.balance.retrieve();
      return true;
    } catch (error) {
      return false;
    }
  }
  async verifyWebhook(payload, signature, secret) {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      return false;
    }
  }
  async parseWebhook(payload, signature, secret) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: new Date(event.created * 1e3),
        provider: "stripe",
        livemode: event.livemode
      };
    } catch (error) {
      throw core.createProviderError("stripe", error, "Webhook parsing failed");
    }
  }
  // ========================================================================
  // Customer Provider Implementation
  // ========================================================================
  async createCustomer(request) {
    try {
      const customer = await this.stripe.customers.create({
        email: request.email,
        name: request.name,
        phone: request.phone,
        description: request.description,
        metadata: request.metadata
      });
      return this.mapStripeCustomer(customer);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async retrieveCustomer(_params) {
    return this.getCustomer(_params.id || _params);
  }
  async getCustomer(id) {
    try {
      const customer = await this.stripe.customers.retrieve(id);
      if (customer.deleted) {
        throw new core.CarnilError("Customer not found", "NOT_FOUND", "NOT_FOUND", 404);
      }
      return this.mapStripeCustomer(customer);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async updateCustomer(id, request) {
    try {
      const customer = await this.stripe.customers.update(id, {
        email: request.email,
        name: request.name,
        phone: request.phone,
        description: request.description,
        metadata: request.metadata
      });
      return this.mapStripeCustomer(customer);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async deleteCustomer(id) {
    try {
      await this.stripe.customers.del(id);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async listCustomers(_request) {
    try {
      const params = {
        limit: _request?.limit || 10,
        starting_after: _request?.startingAfter,
        ending_before: _request?.endingBefore
      };
      if (_request?.email) {
        params.email = _request.email;
      }
      if (_request?.created) {
        params.created = {
          gte: _request.created.gte?.getTime() / 1e3,
          lte: _request.created.lte?.getTime() / 1e3
        };
      }
      const customers = await this.stripe.customers.list(params);
      return customers.data.map((customer) => this.mapStripeCustomer(customer));
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async createPaymentMethod(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrievePaymentMethod(_params) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(_params.id || _params);
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async updatePaymentMethod(_id, _params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async deletePaymentMethod(paymentMethodId) {
    await this.detachPaymentMethod(paymentMethodId);
  }
  async listPaymentMethods(_params) {
    try {
      const customerId = _params?.customerId || _params?.customer || _params;
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: "card"
      });
      return paymentMethods.data.map((pm) => this.mapStripePaymentMethod(pm));
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async attachPaymentMethod(customerId, paymentMethodId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async detachPaymentMethod(paymentMethodId) {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return this.mapStripePaymentMethod(paymentMethod);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  // ========================================================================
  // Product Provider Implementation
  // ========================================================================
  async createProduct(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveProduct(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateProduct(_id, _params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listProducts(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  // ========================================================================
  // Price Provider Implementation
  // ========================================================================
  async createPrice(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrievePrice(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updatePrice(_id, _params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listPrices(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  // ========================================================================
  // Payment Provider Implementation
  // ========================================================================
  async createPaymentIntent(request) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100),
        // Convert to cents
        currency: request.currency,
        customer: request.customerId,
        description: request.description,
        metadata: request.metadata,
        payment_method: request.paymentMethodId,
        receipt_email: request.receiptEmail,
        capture_method: request.captureMethod
      });
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async retrievePaymentIntent(_params) {
    return this.getPaymentIntent(_params.id || _params);
  }
  async getPaymentIntent(id) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async updatePaymentIntent(id, updates) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.update(id, {
        amount: updates.amount ? Math.round(updates.amount * 100) : void 0,
        currency: updates.currency,
        description: updates.description,
        metadata: updates.metadata,
        payment_method: updates.paymentMethodId,
        receipt_email: updates.receiptEmail
      });
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async cancelPaymentIntent(id) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(id);
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async confirmPaymentIntent(id, paymentMethodId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(id, {
        payment_method: paymentMethodId
      });
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async capturePaymentIntent(id, amount) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.capture(id, {
        amount_to_capture: amount ? Math.round(amount * 100) : void 0
      });
      return this.mapStripePaymentIntent(paymentIntent);
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  async listPaymentIntents(_request) {
    try {
      const params = {
        limit: _request?.limit || 10,
        starting_after: _request?.startingAfter,
        ending_before: _request?.endingBefore,
        customer: _request?.customerId
      };
      if (_request?.created) {
        params.created = {
          gte: _request.created.gte?.getTime() / 1e3,
          lte: _request.created.lte?.getTime() / 1e3
        };
      }
      const paymentIntents = await this.stripe.paymentIntents.list(params);
      return paymentIntents.data.map((pi) => this.mapStripePaymentIntent(pi));
    } catch (error) {
      throw core.createProviderError("stripe", error);
    }
  }
  // ========================================================================
  // Mapping Functions
  // ========================================================================
  mapStripeCustomer(customer) {
    return {
      id: customer.id,
      email: customer.email || void 0,
      name: customer.name || void 0,
      phone: customer.phone || void 0,
      description: customer.description || void 0,
      metadata: customer.metadata,
      created: new Date(customer.created * 1e3),
      updated: new Date(customer.created * 1e3),
      // Stripe doesn't track updated time
      deleted: customer.deleted || false,
      provider: "stripe",
      providerId: customer.id
    };
  }
  mapStripePaymentMethod(paymentMethod) {
    const card = paymentMethod.card;
    return {
      id: paymentMethod.id,
      customerId: paymentMethod.customer,
      type: "card",
      brand: card?.brand,
      last4: card?.last4,
      expiryMonth: card?.exp_month,
      expiryYear: card?.exp_year,
      isDefault: false,
      // Would need to check customer's default payment method
      metadata: paymentMethod.metadata || void 0,
      created: new Date(paymentMethod.created * 1e3),
      updated: new Date(paymentMethod.created * 1e3),
      provider: "stripe",
      providerId: paymentMethod.id
    };
  }
  mapStripePaymentIntent(paymentIntent) {
    return {
      id: paymentIntent.id,
      customerId: paymentIntent.customer,
      amount: paymentIntent.amount / 100,
      // Convert from cents
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret || void 0,
      description: paymentIntent.description || void 0,
      metadata: paymentIntent.metadata || void 0,
      paymentMethodId: paymentIntent.payment_method || void 0,
      receiptEmail: paymentIntent.receipt_email || void 0,
      created: new Date(paymentIntent.created * 1e3),
      updated: new Date(paymentIntent.created * 1e3),
      provider: "stripe",
      providerId: paymentIntent.id
    };
  }
  // ========================================================================
  // Placeholder implementations for remaining interfaces
  // ========================================================================
  async createSubscription(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveSubscription(_params) {
    return this.getSubscription(_params.id || _params);
  }
  async getSubscription(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateSubscription(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async cancelSubscription(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listSubscriptions(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async createInvoice(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveInvoice(_params) {
    return this.getInvoice(_params.id || _params);
  }
  async getInvoice(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateInvoice(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async finalizeInvoice(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async payInvoice(_id, _paymentMethodId) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listInvoices(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async createRefund(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveRefund(_params) {
    return this.getRefund(_params.id || _params);
  }
  async getRefund(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listRefunds(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveDispute(_params) {
    return this.getDispute(_params.id || _params);
  }
  async getDispute(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listDisputes(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateDispute(_id, _evidence) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async trackUsage(_metrics) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async trackAIUsage(_metrics) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async getUsageMetrics(_customerId, _featureId, _period) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async getAIUsageMetrics(_customerId, _modelId, _period) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async configure(_options) {
  }
  async batchCreateCustomers(_requests) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async batchCreatePaymentIntents(_requests) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async createWebhookEndpoint(_url, _events) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateWebhookEndpoint(_id, _url, _events) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async deleteWebhookEndpoint(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listWebhookEndpoints() {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
};
function createStripeProvider(config) {
  return new StripeProvider(config);
}
core.Carnil.registerProvider("stripe", {
  create: (config) => new StripeProvider(config)
});

exports.StripeProvider = StripeProvider;
exports.createStripeProvider = createStripeProvider;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map