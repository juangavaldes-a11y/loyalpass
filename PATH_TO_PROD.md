# Path to Production — loyalpass

Estado evaluado el 2026-10-24 sobre la rama `chore/production-hardening`.

## Estado actual

**Ya está bien**
- Tests: 33 suites, 209 tests pasan. Lint: 0 errores, 10 warnings (dentro del tope de `lint:ci`).
- `validateProductionConfiguration` impide arrancar en producción con secretos débiles/por defecto y con CORS `*`.
- Docker: usuario no-root, tini, healthcheck, migraciones como job aparte, apagado ordenado.
- Logs JSON con request ID, rate limiting, helmet.
- CI: lint, tests, build del portal, auditoría de dependencias y smoke test de Docker.

## Bloqueantes (no salir sin resolver)

- [ ] **1. Apple Wallet no genera pases reales.**
  `src/services/applePassService.js` crea el `Pass` pero no lo firma ni devuelve un `.pkpass`; solo devuelve el serial.
  - La config usa un `.p8` (clave APNs); firmar pases requiere certificado Pass Type ID + clave + WWDR.
  - `passTypeId` está fijo en `pass.com.loyalpass.customer`.
  - Faltan `webServiceURL` y endpoints de registro de dispositivos (los pases no se actualizan al cambiar los puntos).
  - Imágenes comentadas.
  - **Decisión:** completar Apple o desactivarlo explícitamente en el lanzamiento.
- [ ] **2. Google Wallet: `issuerId` por defecto.**
  `src/config/googleWallet.js` usa `3388000000022876589` si falta `GOOGLE_ISSUER_ID`. En producción debe fallar al arrancar (o al habilitar wallet), no usar un default.
  - Verificar que `googlePassService.js` firme el JWT con la cuenta de servicio (warnings de `key`, `algo`, `response` sin usar sugieren código incompleto).
- [ ] **3. Pagos BAC sin verificar.**
  Confirmar paths y auth con la cuenta BAC regional; implementar confirmación por webhook y conciliación para que el estado de la suscripción dependa de un pago real.
- [x] **4. Backups con datos en git.**
  `backups/*.json` (5 archivos) está versionado. Sacarlos del índice (`git rm --cached`), agregar `backups/` a `.gitignore`. Si algún dato fuera real, limpiar el historial.
- [x] **5. Vulnerabilidades de dependencias.**
  - Backend: 3 (1 alta, 2 moderadas) por `uuid` vía `sequelize`; `npm run audit:prod` falla hoy, y con él el job de CI.
  - Portal: `follow-redirects` (alta) — `npm audit fix`.

## Importantes

- [ ] **6. Esquema fuera de migraciones.**
  `PortalUser.sync()` en `authService.seedDefaultPlatformAdmin` y `sequelize.sync({ alter: true })` en `src/config/db.js` (dev). En producción las migraciones deben ser la única vía: mover `PortalUser` a una migración.
- [ ] **7. Autenticación y sesiones.**
  - JWT HS256 de 8 h, sin revocación ni refresh.
  - Sin recuperación/cambio de contraseña ni 2FA para el admin de plataforma.
  - Dueños de negocio creados con email falso `…@loyalpass.local`.
- [ ] **8. Cookie de sesión del portal.**
  Verificar `HttpOnly`, `Secure`, `SameSite`. Confirmar que compartir `AUTH_SESSION_SECRET` entre backend y portal es intencional.
- [ ] **9. Portal.**
  - Añadir Content-Security-Policy.
  - `images.remotePatterns` acepta cualquier host `https`; restringir.
  - El Dockerfile no usa tini.
- [ ] **10. Backups operativos.**
  Hoy se escriben en `/data/backups` en el mismo volumen. Falta copia externa, `pg_dump` programado y una prueba de restauración.
- [ ] **11. Monitoreo.**
  Sentry es opcional y requiere `@sentry/node`, que no está en `package.json`. Faltan alertas y métricas.
- [ ] **12. Infraestructura.**
  - TLS y reverse proxy (el compose expone 3000/3001 directamente); configurar `TRUST_PROXY`.
  - Pipeline de deploy y build/push de imágenes a un registry.
  - Rate limiting en memoria: con varias réplicas cada una cuenta aparte; usar Redis si se escala.

## Limpieza menor

- [ ] Eliminar ~20 documentos redundantes en la raíz (`BUILD_COMPLETE.txt`, `PROJECT_COMPLETE.md`, `README_NEW.md`, `QUICK_START.md`, etc.) y dejar README + AGENTS + runbook.
- [ ] Política de retención de datos, términos de servicio y privacidad (hay datos de clientes finales).
- [ ] Al desplegar: rotar el admin sembrado (`admin@loyalpass.local`) y el password de la base.
- [ ] Resolver los 10 warnings de lint (variables sin usar).

## Orden sugerido

1. Dependencias (#5) y backups fuera del repo (#4).
2. Definir alcance de wallet (#1, #2): solo Google al inicio, o completar Apple.
3. Cerrar el flujo de pagos BAC (#3).
4. `PortalUser` a migración (#6), recuperación de contraseña y revisión de sesión (#7, #8).
5. Endurecer el portal (#9).
6. TLS, reverse proxy, backups externos, Sentry y alertas (#10–#12).
7. Limpieza y documentos legales.

## Criterio de salida

- `npm test`, `npm run lint:ci` y ambos `audit` en verde en CI.
- Smoke test de Docker en verde y despliegue en staging con Postgres real.
- Flujo completo probado en staging: alta de negocio → cliente → pase → puntos → pago.
- Restauración de backup probada.
- Secretos rotados y alertas activas.
