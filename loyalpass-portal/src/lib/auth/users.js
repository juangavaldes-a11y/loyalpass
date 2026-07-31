import { ROLES } from '@/lib/auth/roles';

function parseCsv(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// Demo users sourced from env. Replace with DB-backed identity in production.
const users = [
  {
    email: process.env.AUTH_ADMIN_EMAIL || 'admin@loyalpass.local',
    password: process.env.AUTH_ADMIN_PASSWORD || 'admin123',
    role: ROLES.PLATFORM_ADMIN,
    businessId: '',
    apiKey: '',
  },
  {
    email: process.env.AUTH_CLIENT_OWNER_EMAIL || 'owner@loyalpass.local',
    password: process.env.AUTH_CLIENT_OWNER_PASSWORD || 'owner123',
    role: ROLES.CLIENT_OWNER,
    businessId: process.env.LOYALPASS_CLIENT_BUSINESS_ID || '',
    apiKey: process.env.LOYALPASS_CLIENT_API_KEY || '',
  },
  {
    email: process.env.AUTH_CLIENT_STAFF_EMAIL || 'staff@loyalpass.local',
    password: process.env.AUTH_CLIENT_STAFF_PASSWORD || 'staff123',
    role: ROLES.CLIENT_STAFF,
    businessId: process.env.LOYALPASS_CLIENT_BUSINESS_ID || '',
    apiKey: process.env.LOYALPASS_CLIENT_API_KEY || '',
  },
].filter((user) => user.email && user.password);

export function authenticateUser(email, password) {
  return (
    users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password
    ) || null
  );
}

export function listAllowedLoginRoles() {
  return parseCsv(process.env.AUTH_ENABLED_ROLES) || Object.values(ROLES);
}
