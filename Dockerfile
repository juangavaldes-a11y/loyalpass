# syntax=docker/dockerfile:1

# Production dependencies only (sqlite3 and test tooling are devDependencies)
FROM node:25-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:25-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini runs as PID 1 so SIGTERM reaches node and zombie processes are reaped
RUN apk add --no-cache tini \
  && mkdir -p /data/backups \
  && chown -R node:node /data

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node config ./config
COPY --chown=node:node src ./src

# Reported as `release` on logs and error events; pass with --build-arg APP_VERSION=$(git rev-parse --short HEAD)
ARG APP_VERSION=
ENV APP_VERSION=$APP_VERSION \
    BACKUP_DIRECTORY=/data/backups

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]

# Migrations run as a separate one-shot job (`npm run db:migrate`), not on every start,
# so several replicas can't race each other to alter the schema.
CMD ["node", "src/server.js"]
