# Docker Setup Guide

Complete guide to deploying LoyalPass with Docker and Docker Compose.

## Prerequisites

- Docker 20.10+ ([Install](https://docs.docker.com/get-docker/))
- Docker Compose 1.29+ ([Install](https://docs.docker.com/compose/install/))
- 2GB RAM minimum for containers

## Quick Start with Docker Compose

### 1. Start the Stack

```bash
# From project root directory
docker-compose up -d
```

This will:
- Build the Node.js application image
- Start the app container on port 3000
- Start PostgreSQL 15 database
- Set up networking and volumes

### 2. Verify Services

```bash
# Check running containers
docker-compose ps

# Expected output:
# NAME                   COMMAND                  SERVICE     STATUS        PORTS
# loyalpass-app          docker-entrypoint.s...   app         Up 40s        0.0.0.0:3000->3000/tcp
# loyalpass-db           docker-entrypoint.s...   db          Up 45s        5432/tcp
```

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db

# Last 50 lines
docker-compose logs --tail=50 app
```

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/api/health

# Create business
curl -X POST http://localhost:3000/api/businesses \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Business", "logo_url": "https://..."}'
```

### 5. Stop Services

```bash
# Stop but keep data
docker-compose stop

# Stop and remove everything
docker-compose down

# Stop and remove everything including volumes (WARNING: deletes database)
docker-compose down -v
```

## Docker File Breakdown

### Dockerfile

Multi-stage build for optimized production image:

```dockerfile
# Stage 1: Builder
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"
CMD ["npm", "start"]
```

**Benefits:**
- Small image size (node_modules not in final image twice)
- Security hardened (Alpine Linux)
- Health checks for automatic restart
- Non-root user (default in Alpine)

### docker-compose.yml

Two-service orchestration:

```yaml
services:
  app:
    build: .                          # Build from Dockerfile
    container_name: loyalpass-app
    ports:
      - "3000:3000"                  # Expose port 3000
    environment:
      NODE_ENV: production
      DB_DIALECT: postgres
      DB_HOST: db                    # Service name (Docker DNS)
      DB_PORT: 5432
      DB_USERNAME: loyalpass
      DB_PASSWORD: loyalpass_secure_password
      DB_NAME: loyalpass_db
    depends_on:
      db:
        condition: service_healthy    # Wait for DB health check
    volumes:
      - ./logs:/app/logs              # Persist logs
    networks:
      - loyalpass-network             # Custom network

  db:
    image: postgres:15-alpine         # Pre-built PostgreSQL image
    container_name: loyalpass-db
    environment:
      POSTGRES_DB: loyalpass_db
      POSTGRES_USER: loyalpass
      POSTGRES_PASSWORD: loyalpass_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data  # Persist data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U loyalpass"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**Key Features:**
- Service discovery via Docker DNS (`db` hostname)
- Automatic restart on failure (`restart: unless-stopped`)
- Health checks for dependency management
- Volume persistence for logs and database data
- Custom bridge network for service isolation

## Manual Docker Build

For custom builds or CI/CD pipelines:

### Build Image

```bash
# Build with default tag
docker build -t loyalpass:latest .

# Build with specific version
docker build -t loyalpass:v1.0.0 .

# Build for specific platform
docker buildx build --platform linux/amd64,linux/arm64 -t loyalpass:latest .
```

### Run Container

```bash
# Basic run (connects to localhost postgres)
docker run -d \
  --name loyalpass \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=localhost \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=password \
  -e DB_NAME=loyalpass \
  loyalpass:latest

# Run with volume mounts
docker run -d \
  --name loyalpass \
  -p 3000:3000 \
  -v $(pwd)/logs:/app/logs \
  -v $(pwd)/.env:/app/.env \
  -e NODE_ENV=production \
  loyalpass:latest

# Run with network connection to postgres container
docker run -d \
  --name loyalpass \
  --network loyalpass-network \
  -p 3000:3000 \
  -e DB_HOST=loyalpass-db \
  loyalpass:latest
```

### Stop & Remove

```bash
# Stop container
docker stop loyalpass

# Remove container
docker rm loyalpass

# Remove image
docker rmi loyalpass:latest
```

## Environment Variables in Containers

All `.env` variables are passed via docker-compose `environment` section:

```yaml
environment:
  NODE_ENV: production
  DB_DIALECT: postgres
  DB_HOST: db
  DB_PORT: 5432
  DB_USERNAME: loyalpass
  DB_PASSWORD: loyalpass_secure_password
  DB_NAME: loyalpass_db
  PORT: 3000
  LOG_LEVEL: info
```

Override specific variables:

```bash
# Via docker-compose.override.yml
docker-compose -f docker-compose.yml -f docker-compose.override.yml up

# Via command line
DB_PASSWORD=newpassword docker-compose up -d
```

## Production Deployment

### Cloud Platforms

#### AWS (ECS/Fargate)

```bash
# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker tag loyalpass:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/loyalpass:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/loyalpass:latest
```

#### Google Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/loyalpass
gcloud run deploy loyalpass \
  --image gcr.io/PROJECT_ID/loyalpass \
  --platform managed \
  --memory 512Mi \
  --set-env-vars NODE_ENV=production,DB_HOST=cloudsql
```

#### Azure Container Instances

```bash
az acr build --registry myregistry --image loyalpass:latest .
az container create \
  --resource-group myresourcegroup \
  --name loyalpass \
  --image myregistry.azurecr.io/loyalpass:latest \
  --memory 0.5
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loyalpass
spec:
  replicas: 2
  selector:
    matchLabels:
      app: loyalpass
  template:
    metadata:
      labels:
        app: loyalpass
    spec:
      containers:
      - name: loyalpass
        image: loyalpass:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DB_HOST
          value: "postgres-service"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Common issues:
# - Port 3000 already in use: change docker-compose.yml port mapping
# - Database connection failed: verify DB_HOST and credentials
# - npm install failed: check npm-debug.log in volume
```

### Database Connection Issues

```bash
# Test PostgreSQL connectivity
docker-compose exec app psql -h db -U loyalpass -d loyalpass_db -c "SELECT 1"

# Check database logs
docker-compose logs db

# Reset database (WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

### Rebuild After Code Changes

```bash
# Rebuild image without cache
docker-compose build --no-cache

# Restart services
docker-compose restart app
```

### Memory Issues

Increase Docker memory limit in Docker Desktop settings.

For docker-compose, add resource limits:

```yaml
app:
  mem_limit: 1g
  memswap_limit: 2g
```

## Security Best Practices

1. **Use .env files for secrets** (not in docker-compose.yml)
2. **Never commit credentials** to repository
3. **Use Alpine images** for smaller attack surface
4. **Run as non-root** (default in Alpine)
5. **Use read-only file systems** when possible
6. **Implement resource limits** to prevent DoS
7. **Scan images for vulnerabilities**:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image loyalpass:latest
```

## Monitoring & Logging

### View Application Logs

```bash
# Real-time logs
docker-compose logs -f app

# Logs from specific time
docker-compose logs --since 2024-01-15 --until 2024-01-16
```

### Monitor Resource Usage

```bash
# Live statistics
docker stats loyalpass-app

# Specific container
docker stats loyalpass-app --no-stream
```

### Access Container Shell

```bash
# Run bash in container
docker-compose exec app sh

# Run npm command
docker-compose exec app npm list
```

## Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused resources
docker system prune -a --volumes
```

---

**Last Updated**: 2024
**Docker**: 20.10+
**Docker Compose**: 1.29+
