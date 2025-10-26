'use strict';

var Razorpay = require('razorpay');
var core = require('@carnil/core');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var Razorpay__default = /*#__PURE__*/_interopDefault(Razorpay);

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var RazorpayProvider = class {
  constructor(config) {
    this.name = "razorpay";
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
      "inr",
      "usd",
      "eur",
      "gbp",
      "aud",
      "cad",
      "sgd",
      "hkd",
      "jpy",
      "aed",
      "sar",
      "qar",
      "kwd",
      "bhd",
      "omr",
      "jod",
      "lbp",
      "egp",
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
      "twd",
      "thb",
      "vnd",
      "idr",
      "myr",
      "php",
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
      "IN",
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
      "ID",
      "PH",
      "VN",
      "KR",
      "TW",
      "HK"
    ];
    this.config = config;
    this.razorpay = new Razorpay__default.default({
      key_id: config.apiKey,
      key_secret: config.apiKey
      // Razorpay uses key_secret for API key
    });
  }
  // ========================================================================
  // Base Provider Implementation
  // ========================================================================
  async healthCheck() {
    try {
      await this.razorpay.payments.fetch("dummy");
      return true;
    } catch (error) {
      return error.statusCode === 404;
    }
  }
  async verifyWebhook(payload, signature, secret) {
    try {
      const crypto = __require("crypto");
      const expectedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
      return signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }
  async parseWebhook(payload, _signature, _secret) {
    try {
      const event = JSON.parse(payload);
      return {
        id: event.id || event.entity,
        type: event.event,
        data: event.payload || event,
        created: new Date(event.created_at * 1e3),
        provider: "razorpay",
        livemode: !this.config.apiKey.startsWith("rzp_test_")
      };
    } catch (error) {
      throw core.createProviderError("razorpay", error, "Webhook parsing failed");
    }
  }
  // ========================================================================
  // Customer Provider Implementation
  // ========================================================================
  async createCustomer(request) {
    try {
      const customer = await this.razorpay.customers.create({
        name: request.name,
        email: request.email,
        contact: request.phone,
        notes: request.metadata
      });
      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async getCustomer(id) {
    try {
      const customer = await this.razorpay.customers.fetch(id);
      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async updateCustomer(id, request) {
    try {
      const customer = await this.razorpay.customers.edit(id, {
        name: request.name,
        email: request.email,
        contact: request.phone
      });
      return this.mapRazorpayCustomer(customer);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async deleteCustomer(_id) {
  }
  async listCustomers(request) {
    try {
      const params = {
        count: request?.limit || 10
      };
      if (request?.startingAfter) {
        params.from = request.startingAfter;
      }
      if (request?.endingBefore) {
        params.to = request.endingBefore;
      }
      const customers = await this.razorpay.customers.all(params);
      return customers.items.map((customer) => this.mapRazorpayCustomer(customer));
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async listPaymentMethods(_params) {
    try {
      return [];
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async attachPaymentMethod(_customerId, _paymentMethodId) {
    try {
      throw new core.CarnilError("Not supported in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async detachPaymentMethod(_paymentMethodId) {
    try {
      throw new core.CarnilError("Not supported in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async setDefaultPaymentMethod(_customerId, _paymentMethodId) {
    try {
      throw new core.CarnilError("Not supported in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  // ========================================================================
  // Payment Provider Implementation
  // ========================================================================
  async createPaymentIntent(request) {
    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(request.amount * 100),
        // Convert to paise
        currency: request.currency,
        receipt: `receipt_${Date.now()}`,
        notes: request.metadata
      });
      return this.mapRazorpayOrder(order, request.customerId);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async getPaymentIntent(id) {
    try {
      const order = await this.razorpay.orders.fetch(id);
      return this.mapRazorpayOrder(order);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async updatePaymentIntent(_id, _updates) {
    try {
      throw new core.CarnilError("Orders cannot be updated in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async cancelPaymentIntent(_id) {
    try {
      throw new core.CarnilError("Orders cannot be cancelled in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async confirmPaymentIntent(id, _paymentMethodId) {
    try {
      const order = await this.razorpay.orders.fetch(id);
      return this.mapRazorpayOrder(order);
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async capturePaymentIntent(_id, _amount) {
    try {
      throw new core.CarnilError("Not supported in Razorpay", "NOT_SUPPORTED");
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  async listPaymentIntents(request) {
    try {
      const params = {
        count: request?.limit || 10
      };
      if (request?.startingAfter) {
        params.from = request.startingAfter;
      }
      if (request?.endingBefore) {
        params.to = request.endingBefore;
      }
      const orders = await this.razorpay.orders.all(params);
      return orders.items.map((order) => this.mapRazorpayOrder(order));
    } catch (error) {
      throw core.createProviderError("razorpay", error);
    }
  }
  // ========================================================================
  // Mapping Functions
  // ========================================================================
  mapRazorpayCustomer(customer) {
    return {
      id: customer.id,
      email: customer.email || void 0,
      name: customer.name || void 0,
      phone: customer.contact || void 0,
      description: void 0,
      metadata: customer.notes || {},
      created: new Date(customer.created_at * 1e3),
      updated: new Date(customer.created_at * 1e3),
      // Razorpay doesn't track updated time
      deleted: customer.notes?.status === "inactive",
      provider: "razorpay",
      providerId: customer.id
    };
  }
  mapRazorpayOrder(order, customerId) {
    return {
      id: order.id,
      customerId: customerId || "",
      amount: order.amount / 100,
      // Convert from paise
      currency: order.currency,
      status: this.mapRazorpayOrderStatus(order.status),
      clientSecret: order.id,
      // In Razorpay, the order ID is used for frontend integration
      description: order.receipt || void 0,
      metadata: order.notes || {},
      paymentMethodId: void 0,
      receiptEmail: void 0,
      created: new Date(order.created_at * 1e3),
      updated: new Date(order.created_at * 1e3),
      provider: "razorpay",
      providerId: order.id
    };
  }
  mapRazorpayOrderStatus(status) {
    switch (status) {
      case "created":
        return "requires_payment_method";
      case "attempted":
        return "processing";
      case "paid":
        return "succeeded";
      case "failed":
        return "failed";
      default:
        return "requires_payment_method";
    }
  }
  // ========================================================================
  // Placeholder implementations for remaining interfaces
  // ========================================================================
  async createSubscription(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async getSubscription(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateSubscription(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async cancelSubscription(_id, _immediately) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listSubscriptions(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async createInvoice(_request) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
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
  async getRefund(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listRefunds(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async getDispute(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listDisputes() {
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
  // Missing interface methods
  async init() {
  }
  async retrieveCustomer(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async createPaymentMethod(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrievePaymentMethod(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updatePaymentMethod(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async deletePaymentMethod(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrievePaymentIntent(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveSubscription(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveInvoice(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveRefund(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveDispute(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  // Product management methods
  async createProduct(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrieveProduct(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updateProduct(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listProducts(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async deleteProduct(_id) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  // Price management methods
  async createPrice(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async retrievePrice(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async updatePrice(_id, _updates) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
  async listPrices(_params) {
    throw new core.CarnilError("Not implemented", "NOT_IMPLEMENTED");
  }
};
function createRazorpayProvider(config) {
  return new RazorpayProvider(config);
}
core.Carnil.registerProvider("razorpay", {
  create: (config) => new RazorpayProvider(config)
});

exports.RazorpayProvider = RazorpayProvider;
exports.createRazorpayProvider = createRazorpayProvider;
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map