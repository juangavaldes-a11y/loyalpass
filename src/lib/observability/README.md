# observability

Reusable structured logging, request tracing and error reporting for Express apps.
Self-contained: no imports from the host project. Only runtime dependency is `pino`;
`@sentry/node` is optional.

## Reuse in another project

1. Copy this folder to `src/lib/observability/` (the `__tests__` folder is optional).
2. `npm i pino` (and `npm i @sentry/node` if you want error reporting).
3. Create a wiring file for the project:

```js
// src/observability.js
const { createObservability } = require('./lib/observability');

module.exports = createObservability({
  service: 'my-service',
  redactKeys: ['ssn'],                       // added to the built-in sensitive-key list
  extractContext: (req) => ({ tenantId: req.tenantId, userId: req.user?.id }),
});
```

4. Mount it first in the app and install the process handlers at startup:

```js
const observability = require('./observability');
observability.installProcessHandlers();          // server entrypoint
app.use(observability.requestLogger());          // before body parsers and routes
// in your error middleware, for 5xx:
logger.error('Unhandled application error', err, ctx);
observability.captureException(err, ctx);
```

## What you get

| Feature | Detail |
|---|---|
| JSON logs | One object per line on stdout: `level` (label), `time` (ISO), `msg`, `service`, `env`, `release`. |
| Redaction | Case-insensitive key match (`password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, ...), recursive, handles arrays and circular refs. Add keys with `redactKeys`. |
| Errors | `Error`s are serialized (`err.type/message/stack/code/cause`). Plain `JSON.stringify` drops all of these. |
| Request ID | Reuses a safe incoming `X-Request-Id`, otherwise generates a UUID; echoed in the response header. |
| Request context | `AsyncLocalStorage` adds `requestId` plus whatever `extractContext(req)` returns (tenant, user) to **every** log line in the request, including ones from services. |
| Request line | `request.completed` (info <400, warn 4xx, error 5xx), `request.slow`, `request.aborted`. Query strings are never logged. `/health` successes are skipped. |
| Process safety | `unhandledRejection` / `uncaughtException` log `fatal`, report, flush, exit 1 (once). |
| Sentry | Active only when `SENTRY_DSN` is set and `@sentry/node` is installed; otherwise a no-op. `sendDefaultPii: false` and events are redacted in `beforeSend`. |

Logger API: `logger.{fatal,error,warn,info,debug,trace}(message, dataOrError?, context?)` and
`logger.child(bindings)`. Use event-style messages (`customer.created`) with data in fields, not
interpolated strings, so logs stay queryable.

## Environment variables

| Var | Default | |
|---|---|---|
| `LOG_LEVEL` | `info` (`silent` when `NODE_ENV=test`) | `fatal`..`trace`, or `silent` |
| `SENTRY_DSN` | unset | enables error reporting |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` | |
| `APP_VERSION` / `GIT_SHA` | unset | added as `release` |

## Shipping logs (free tiers)

The contract is "JSON on stdout", so switching vendor never touches app code.

- **Grafana Cloud (Loki)**: run Grafana Alloy or Promtail beside the container, or use the platform's log drain.
- **Axiom**: use the host's log drain / Vector, or pass a pino transport:
  `createObservability({ ..., transport: { target: '@axiomhq/pino', options: { dataset, token } } })`
  (`npm i @axiomhq/pino`; note `transport` and `destination` are mutually exclusive).
- **Better Stack**: `transport: { target: '@logtail/pino', options: { sourceToken } }`.

Local pretty output: `npm run dev | npx pino-pretty`.

## Tests

`npm test -- src/lib/observability` (uses an in-memory destination; no network).
