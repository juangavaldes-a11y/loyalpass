const fetch = require('node-fetch');

function getConfig() {
  const baseUrl = process.env.BAC_API_BASE_URL;
  const apiKey = process.env.BAC_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error('BAC_API_BASE_URL and BAC_API_KEY are required');
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey };
}

class BacPaymentService {
  static async createPayment({ amountMinor, currency, reference, returnUrl, idempotencyKey }) {
    const { baseUrl, apiKey } = getConfig();
    const path = process.env.BAC_CREATE_PAYMENT_PATH || '/payments';
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ amount: amountMinor, currency, reference, returnUrl }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`BAC payment request failed with status ${response.status}`);
    }
    return body;
  }

  static async verifyWebhookSignature() {
    throw new Error('BAC webhook signature verification requires the regional BAC integration contract');
  }
}

module.exports = BacPaymentService;