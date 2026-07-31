const BusinessLifecycleService = require('../services/businessLifecycleService');
const ApplePassService = require('../services/applePassService');
const GooglePassService = require('../services/googlePassService');
const sequelize = require('../config/db');

process.env.NODE_ENV = 'test';

describe('service coverage helpers', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('business lifecycle service can rotate API keys and create owner context', async () => {
    const business = await sequelize.models.Business.create({ name: 'Lifecycle Business' });

    const context = await BusinessLifecycleService.createBusinessOwnerContext(business);
    expect(context.apiKey).toBeDefined();
    expect(context.ownerPassword).toBeDefined();

    const rotated = await BusinessLifecycleService.rotateBusinessApiKey(business.id);
    expect(rotated).toBeDefined();
  });

  test('apple and google pass services expose graceful fallback behavior', async () => {
    const appleSerial = await ApplePassService.generatePass({ id: 'biz-1' }, { id: 'cust-1' }, { balance: 5 });
    expect(appleSerial).toBeNull();

    const appleUpdated = await ApplePassService.updatePass('serial-1', 7);
    expect(appleUpdated).toBe(true);

    const googleClass = await GooglePassService.createPassClass('business-1', { name: 'Test' });
    expect(googleClass).toBeNull();

    const googlePass = await GooglePassService.generatePass('business-1', 'customer-1', { name: 'Test' }, { name: 'User' }, { balance: 5 });
    expect(googlePass).toBeNull();

    const updatedGoogle = await GooglePassService.updatePass('object-1', { balance: 5 });
    expect(updatedGoogle).toBeNull();

    expect(() => GooglePassService.generateAddToWalletJwt('object-1')).toThrow('Google service account not configured');
  });
});
