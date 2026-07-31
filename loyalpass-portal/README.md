# LoyalPass Portal (Next.js, JavaScript)

Separate UI repository for:
- Platform admins to onboard and update clients
- Client teams to manage loyalty customers

Built with:
- Next.js (App Router) in pure JavaScript
- React Query for client-side caching and invalidation
- Route Handlers as a server-side API gateway/BFF
- Signed cookie sessions with role-based access control
- Docker multi-stage deployment

## Architecture

### Layers
- `src/app/*`: UI routes and Next.js route handlers
- `src/features/*`: Domain features (admin/client)
- `src/lib/api/*`: API management (HTTP client, server backend connector, errors)
- `src/lib/query/*`: Query client and cache strategy
- `src/providers/*`: App-wide providers (React Query)
- `src/config/*`: Runtime environment configuration

### API Management Strategy
- Browser talks only to internal routes under `/api/*`
- Route handlers call backend API using `LOYALPASS_API_BASE_URL`
- API key headers are attached server-side from authenticated session context
- Errors normalized through `ApiError`

### Auth and RBAC
- Login via `POST /api/auth/login`
- Logout via `POST /api/auth/logout`
- Signed JWT session cookie (`httpOnly`, `sameSite=lax`)
- Middleware route protection for admin/client role boundaries

### Caching Strategy
- Client caching via React Query:
	- `staleTime`: 60s
	- `gcTime`: 10m
	- Mutations invalidate affected query keys
- Server-side fetch caching for selected reads:
	- `revalidate` and `tags` used in route handlers
	- `revalidateTag` on mutations

## Routes

### UI
- `/`: Landing page
- `/login`: Role-based login
- `/admin`: Admin client management
- `/client`: Client customer management

### Internal API (BFF)
- `GET/POST/PUT /api/admin/clients`
- `GET/POST/PUT /api/client/customers`
- `GET/POST /api/client/points`
- `GET/POST /api/client/passes`
- `POST /api/auth/login`
- `POST /api/auth/logout`

## Environment

Copy `.env.example` to `.env` and set values:

```bash
cp .env.example .env
```

Required:
- `LOYALPASS_API_BASE_URL`
- `AUTH_SESSION_SECRET`
- `AUTH_ADMIN_EMAIL`, `AUTH_ADMIN_PASSWORD`
- `AUTH_CLIENT_OWNER_EMAIL`, `AUTH_CLIENT_OWNER_PASSWORD`
- `AUTH_CLIENT_STAFF_EMAIL`, `AUTH_CLIENT_STAFF_PASSWORD`
- `LOYALPASS_CLIENT_BUSINESS_ID`
- `LOYALPASS_CLIENT_API_KEY`

## Local Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Docker Deployment

### Build and run

```bash
docker compose up --build
```

Portal will be available at `http://localhost:3001`.

## Current Scope and Next Steps

Implemented now:
- Admin create/lookup/update business client
- Client create/list/update customer
- Client add/redeem points and pass create/update/get
- Role-based login/logout with middleware route protection
- Shared API/caching architecture

Recommended next milestones:
1. Move from env-demo users to database-backed identity provider
2. Add secure credential vaulting instead of session payload API keys
3. Add full client listing endpoint from backend (`GET /api/businesses`)
4. Add operator audit logs for admin/client actions
5. Add integration tests around BFF route handlers and cache invalidation
