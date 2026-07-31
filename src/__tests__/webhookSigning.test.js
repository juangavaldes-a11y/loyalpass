const http = require('http');
const crypto = require('crypto');
const WebhookService = require('../services/webhookService');

describe('webhook signing', () => {
  test('delivers signed payloads to configured endpoints', async () => {
    let received = null;

    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        received = {
          headers: req.headers,
          body: JSON.parse(body),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
      await WebhookService.deliver({
        url: `http://127.0.0.1:${port}`,
        secret: 'my-secret',
        event: 'points.updated',
        payload: { customerId: 'cust-1', balance: 10 },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(received).not.toBeNull();
      expect(received.body).toEqual({ customerId: 'cust-1', balance: 10 });

      const signatureHeader = received.headers['x-loyalpass-signature'];
      expect(signatureHeader).toMatch(/^t=\d+,v1=[a-f0-9]+$/);

      const [timestampPart, signaturePart] = signatureHeader.split(',');
      const timestamp = timestampPart.split('=')[1];
      const signature = signaturePart.split('=')[1];
      const expectedSignature = crypto
        .createHmac('sha256', 'my-secret')
        .update(`${timestamp}.${JSON.stringify({ customerId: 'cust-1', balance: 10 })}`)
        .digest('hex');

      expect(signature).toBe(expectedSignature);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
