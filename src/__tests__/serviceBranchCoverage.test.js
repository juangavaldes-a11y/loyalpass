const fs = require('fs');
const path = require('path');
const sequelize = require('../config/db');
const initializeDatabase = require('../database/migrate');
const { generateQRCode, generateQRCodeBuffer } = require('../utils/qrCode');
const { applePassTemplate, googlePassTemplate } = require('../utils/passTemplates');
const { getPassContext } = require('../utils/passContext');
const PassService = require('../services/passService');
const PointsService = require('../services/pointsService');
const ApplePassService = require('../services/applePassService');
const GooglePassService = require('../services/googlePassService');
const WebhookService = require('../services/webhookService');
const { Business, Customer, Points, Pass } = require('../models');

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
  toBuffer: jest.fn(),
}));

const QRCode = require('qrcode');

describe('service branch coverage', () => {
  let business;
  let customer;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await initializeDatabase();

    business = await Business.create({ name: 'Branch Business' });
    customer = await Customer.create({ business_id: business.id, name: 'Branch Customer', email: 'branch@example.com' });
    await Points.create({ customer_id: customer.id, balance: 7 });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('covers database migration and QR code helpers', async () => {
    const migrated = await initializeDatabase();
    expect(migrated).toBeUndefined();

    QRCode.toDataURL.mockResolvedValue('data:image/png;base64,abc');
    await expect(generateQRCode('hello')).resolves.toBe('data:image/png;base64,abc');

    QRCode.toDataURL.mockRejectedValue(new Error('qr fail'));
    await expect(generateQRCode('hello')).rejects.toThrow('Failed to generate QR code: qr fail');

    QRCode.toBuffer.mockResolvedValue(Buffer.from('abc'));
    await expect(generateQRCodeBuffer('hello')).resolves.toEqual(Buffer.from('abc'));

    QRCode.toBuffer.mockRejectedValue(new Error('buffer fail'));
    await expect(generateQRCodeBuffer('hello')).rejects.toThrow('Failed to generate QR code buffer: buffer fail');
  });

  test('covers pass templates and pass context resolution', async () => {
    const template = applePassTemplate({ name: 'Biz', brand_color: '#123456', text_color: '#ffffff' }, { id: 'cust-1', name: 'User' }, { balance: 3 }, 'qr');
    expect(template.primaryFields[0].value).toBe('3');

    const googleTemplate = googlePassTemplate({ id: 'biz-1', name: 'Biz', logo_url: 'https://x' }, { id: 'cust-1', name: 'User' }, { balance: 4 });
    expect(googleTemplate.barcode.value).toBe('cust-1');

    const passContext = await getPassContext(business.id, customer.id);
    expect(passContext.customer.id).toBe(customer.id);
    expect(passContext.points.balance).toBe(7);
  });

  test('covers pass service fallback paths and points service webhooks', async () => {
    const appleSpy = jest.spyOn(ApplePassService, 'generatePass').mockRejectedValue(new Error('apple fail'));
    const googleSpy = jest.spyOn(GooglePassService, 'generatePass').mockRejectedValue(new Error('google fail'));
    const pass = await PassService.createPass(business.id, customer.id);
    expect(pass.pass.business_id).toBe(business.id);

    const appleUpdateSpy = jest.spyOn(ApplePassService, 'updatePass').mockRejectedValue(new Error('apple update fail'));
    const googleUpdateSpy = jest.spyOn(GooglePassService, 'updatePass').mockRejectedValue(new Error('google update fail'));
    const updated = await PassService.updatePass(business.id, pass.pass.id, customer.id, { balance: 8 });
    expect(updated.id).toBe(pass.pass.id);

    const missing = await PassService.getPassByCustomerId(business.id, customer.id);
    expect(missing.id).toBe(pass.pass.id);

    const points = await PointsService.getPoints(business.id, customer.id);
    expect(points.balance).toBe(7);

    const addResult = await PointsService.addPoints(business.id, customer.id, 2);
    expect(addResult).toBeDefined();

    await expect(PointsService.addPoints(business.id, customer.id, 0)).rejects.toThrow('Amount must be greater than 0');
    await expect(PointsService.redeemPoints(business.id, customer.id, 99)).rejects.toThrow('Insufficient points');

    const webhookSpy = jest.spyOn(WebhookService, 'deliver').mockRejectedValue(new Error('webhook fail'));
    process.env.WEBHOOK_URL = 'https://example.test/hook';
    process.env.WEBHOOK_SECRET = 'secret';
    const redeemed = await PointsService.redeemPoints(business.id, customer.id, 3);
    expect(redeemed).toBeDefined();

    await expect(PointsService.setBalance(business.id, customer.id, -1)).rejects.toThrow('Balance cannot be negative');

    const setBalance = await PointsService.setBalance(business.id, customer.id, 10);
    expect(setBalance.balance).toBe(10);

    appleSpy.mockRestore();
    googleSpy.mockRestore();
    appleUpdateSpy.mockRestore();
    googleUpdateSpy.mockRestore();
    webhookSpy.mockRestore();
  });
});
