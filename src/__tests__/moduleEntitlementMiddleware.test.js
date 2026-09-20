jest.mock('../services/moduleEntitlementService', () => ({
  isEnabled: jest.fn(),
}));

const ModuleEntitlementService = require('../services/moduleEntitlementService');
const { requireModule } = require('../middleware/moduleEntitlementMiddleware');

function createResponse() {
  const response = { status: jest.fn() };
  response.status.mockReturnValue(response);
  response.json = jest.fn();
  return response;
}

describe('module entitlement middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects disabled modules', async () => {
    ModuleEntitlementService.isEnabled.mockResolvedValue(false);
    const response = createResponse();
    const next = jest.fn();

    await requireModule('promotions')({ businessId: 'business-1' }, response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'MODULE_DISABLED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('continues when the module is enabled', async () => {
    ModuleEntitlementService.isEnabled.mockResolvedValue(true);
    const response = createResponse();
    const next = jest.fn();

    await requireModule('points')({ businessId: 'business-1' }, response, next);

    expect(next).toHaveBeenCalledWith();
  });
});