export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  CLIENT_OWNER: 'client_owner',
  CLIENT_STAFF: 'client_staff',
};

export const routeAccess = [
  {
    prefix: '/admin',
    roles: [ROLES.PLATFORM_ADMIN],
  },
  {
    prefix: '/client',
    roles: [ROLES.CLIENT_OWNER, ROLES.CLIENT_STAFF],
  },
  {
    prefix: '/api/admin',
    roles: [ROLES.PLATFORM_ADMIN],
  },
  {
    prefix: '/api/client',
    roles: [ROLES.CLIENT_OWNER, ROLES.CLIENT_STAFF],
  },
];

export function isRoleAllowed(pathname, role) {
  const match = routeAccess.find((rule) => pathname.startsWith(rule.prefix));
  if (!match) return true;
  return match.roles.includes(role);
}
