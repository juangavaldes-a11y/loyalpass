const { mapBusinessUpdates, mapCustomerUpdates } = require('../utils/fieldMapping');
const { assertBusinessAccess, assertPlatformAdmin } = require('../utils/tenantAccess');

describe('shared helpers', () => {
  test('maps business payloads to model field names', () => {
    const updates = mapBusinessUpdates({ name: 'Acme', logoUrl: 'https://x', textColor: '#fff' });

    expect(updates).toEqual({ name: 'Acme', logo_url: 'https://x', text_color: '#fff' });
  });

  test('maps customer payloads to model field names', () => {
    const updates = mapCustomerUpdates({ name: 'Jane', email: 'jane@example.com' });

    expect(updates).toEqual({ name: 'Jane', email: 'jane@example.com' });
  });

  test('allows platform admin to access any business', () => {
    expect(() => assertBusinessAccess({ isPlatformAdmin: true }, 'business-1')).not.toThrow();
  });

  test('rejects non-admin access outside the tenant scope', () => {
    expect(() => assertBusinessAccess({ isPlatformAdmin: false, businessId: 'tenant-a' }, 'tenant-b')).toThrow('Forbidden: Access denied');
  });

  test('requires platform admin for admin-only operations', () => {
    expect(() => assertPlatformAdmin({ isPlatformAdmin: false })).toThrow('Forbidden: Admin access required');
  });
});
