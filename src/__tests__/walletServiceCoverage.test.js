jest.mock('google-auth-library', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
  },
}));

jest.mock('../config/googleWallet', () => ({
  serviceAccount: { client_email: 'service@example.com', private_key: 'private-key' },
  issuerId: 'issuer-123',
}));

jest.mock('../config/appleWallet', () => ({
  certificate: 'cert',
  teamId: 'team-1',
  keyId: 'key-1',
  passTypeId: 'pass-type',
}));

jest.mock('../utils/passTemplates', () => ({
  googlePassTemplate: jest.fn(() => ({ objectType: 'genericObject' })),
  applePassTemplate: jest.fn(() => ({ passTypeIdentifier: 'pass' })),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../utils/qrCode', () => ({
  generateQRCodeBuffer: jest.fn().mockResolvedValue(Buffer.from('qr')), 
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678'),
}));

jest.mock('pkpass', () => ({
  Pass: jest.fn().mockImplementation(() => ({ addBuffer: jest.fn() })),
}));

const { google } = require('google-auth-library');
const googleConfig = require('../config/googleWallet');
const GooglePassService = require('../services/googlePassService');
const ApplePassService = require('../services/applePassService');
const logger = require('../utils/logger');
const { googlePassTemplate, applePassTemplate } = require('../utils/passTemplates');
const { generateQRCodeBuffer } = require('../utils/qrCode');

describe('wallet service coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    googleConfig.serviceAccount = { client_email: 'service@example.com', private_key: 'private-key' };
  });

  test('google pass service covers config fallback and success paths', async () => {
    googleConfig.serviceAccount = null;
    await expect(GooglePassService.createPassClass('business123', { name: 'Acme' })).resolves.toBeNull();
    await expect(GooglePassService.generatePass('business123', 'customer123', { name: 'Acme' }, { id: 'customer-1' }, { balance: 10 })).resolves.toBeNull();
    await expect(GooglePassService.updatePass('', 5)).resolves.toBeNull();

    googleConfig.serviceAccount = { client_email: 'service@example.com', private_key: 'private-key' };
    const request = jest.fn().mockResolvedValue({ ok: true });
    google.auth.GoogleAuth.mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue({ request }),
    }));

    await expect(GooglePassService.createPassClass('business123', { name: 'Acme', logo_url: 'logo.png', brand_color: '#000', text_color: '#fff' })).resolves.toBe('issuer-123.business');
    await expect(GooglePassService.generatePass('business123', 'customer123', { name: 'Acme' }, { id: 'customer-1' }, { balance: 10 })).resolves.toBe('issuer-123.customer');
    await expect(GooglePassService.updatePass('obj-123', { balance: 20 })).resolves.toBe(true);
    expect(googlePassTemplate).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  test('apple pass service covers generation and update paths', async () => {
    const appleConfig = require('../config/appleWallet');
    appleConfig.certificate = null;
    await expect(ApplePassService.generatePass({ id: 'business-1' }, { id: 'customer-1' }, { balance: 5 })).resolves.toBeNull();

    appleConfig.certificate = 'cert';
    const result = await ApplePassService.generatePass({ id: 'business-1' }, { id: 'customer-1' }, { balance: 5 });
    expect(result).toBe('business-12345678');
    expect(generateQRCodeBuffer).toHaveBeenCalledWith('customer-1');
    expect(applePassTemplate).toHaveBeenCalled();

    await expect(ApplePassService.updatePass('serial-1', 12)).resolves.toBe(true);
    await expect(ApplePassService.pushUpdate(['a', 'b'], 'business-1')).resolves.toBe(true);
  });
});
