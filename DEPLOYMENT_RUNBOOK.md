# Deployment Runbook

## Backend + Portal Stack

### 1. Prerequisites
- Docker Engine 24+
- Docker Compose v2
- Ports 3000 and 3001 available on the host

### 2. Start the full stack
```bash
docker compose --profile full up --build -d
```

### 3. Start only the backend
```bash
docker compose --profile backend up --build -d
```

### 4. Start only the portal
```bash
docker compose --profile portal up --build -d
```

### 5. Verify services
```bash
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3001
```

### 6. Admin login
The backend seeds a platform admin user automatically on startup.
Default credentials:
- Email: admin@loyalpass.local
- Password: change-me-in-production

### 7. Stop and reset
```bash
docker compose down
docker compose down -v
```

## Notes
- The backend exposes health checks at /health.
- The portal is served on port 3001 and proxies to the backend on port 3000.
- Audit logs are available in the admin portal once the user signs in as platform admin.
