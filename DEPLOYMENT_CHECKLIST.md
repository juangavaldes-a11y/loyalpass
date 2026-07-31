# Deployment Checklist

## Pre-deployment
- [x] Confirm the app builds and starts locally with `npm install` and `npm run dev`
- [x] Verify the test suite passes with `npm test -- --runInBand`
- [x] Confirm the latest coverage snapshot is above the current baseline
- [x] Review environment variables in `.env` and ensure secrets are set
- [x] Ensure the database is reachable and migrations are applied
- [x] Verify the health endpoint responds at `/health`

## Runtime readiness
- [x] Health checks and alert metadata are exposed via `/health`
- [x] Backup creation and restore endpoints are available for operational recovery
- [x] Audit retention cleanup is available for governance hygiene
- [x] Logging and error handling are wired through the main service paths

## Production deployment
- [ ] Choose the target environment (staging or production)
- [ ] Provision the production database and storage for backups
- [ ] Configure secrets for wallet providers and admin access
- [ ] Set `NODE_ENV=production`
- [ ] Deploy the Docker image or host process
- [ ] Validate the `/health` endpoint after deployment
- [ ] Run a smoke test for business creation, customer creation, and points issuance
- [ ] Verify backup creation and restore with a non-production sample backup
- [ ] Review monitoring alerts and paging configuration

## Post-deployment
- [ ] Confirm uptime and error-rate monitoring dashboards are active
- [ ] Review audit logs and retention settings
- [ ] Capture the deployment commit and version for rollback reference
