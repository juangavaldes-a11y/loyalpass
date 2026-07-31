const crypto = require('crypto');
const fetch = require('node-fetch');
const logger = require('../utils/logger');

class WebhookService {
  static createSignature(secret, payload, timestamp) {
    if (!secret) {
      return null;
    }

    const normalizedPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${normalizedPayload}`)
      .digest('hex');
  }

  static async deliver({ url, secret, event, payload, headers = {} }) {
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = this.createSignature(secret, body, timestamp);

    const requestHeaders = {
      'Content-Type': 'application/json',
      'X-LoyalPass-Event': event,
      ...headers,
    };

    if (signature) {
      requestHeaders['X-LoyalPass-Signature'] = `t=${timestamp},v1=${signature}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body,
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
      }

      logger.info('Webhook delivered', { url, event, status: response.status });
      return { ok: true, status: response.status };
    } catch (error) {
      logger.error('Webhook delivery failed', error, { url, event });
      throw error;
    }
  }
}

module.exports = WebhookService;
