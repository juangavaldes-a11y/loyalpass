const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sequelize = require('./config/db');
const config = require('./config/env');
const observability = require('./observability');
const apiKeyAuth = require('./middleware/authMiddleware');
const { generalApiLimiter, authLimiter } = require('./middleware/rateLimitMiddleware');
const authRoutes = require('./routes/authRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Routes
const businessRoutes = require('./routes/businessRoutes');
const customerRoutes = require('./routes/customerRoutes');
const passRoutes = require('./routes/passRoutes');
const pointsRoutes = require('./routes/pointsRoutes');
const promotionRoutes = require('./routes/promotionRoutes');
const moduleRoutes = require('./routes/moduleRoutes');

const app = express();

// Behind a reverse proxy, req.ip (rate limiting, logs) is only correct if the proxy is trusted.
// Left off by default: trusting an unknown X-Forwarded-For lets clients spoof their IP.
app.set('trust proxy', config.app.trustProxy);

// Middleware
app.use(observability.requestLogger()); // first, so every log line carries the request ID
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.app.nodeEnv !== 'production' || config.app.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origin not allowed by CORS policy');
    error.statusCode = 403;
    return callback(error);
  },
}));
app.use(express.json({ limit: config.app.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.app.bodyLimit }));

// Health check (no auth required)
app.get('/health', async (req, res) => {
  try {
    await sequelize.query('SELECT 1');
    if (config.app.nodeEnv === 'production') {
      await sequelize.query('SELECT 1 FROM "SequelizeMeta" LIMIT 1');
    }
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'loyalpass',
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      checks: { database: 'ok', migrations: 'ok', walletIntegrations: 'optional' },
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      service: 'loyalpass',
      checks: { database: 'unavailable', migrations: 'unavailable' },
    });
  }
});

// Auth routes
app.use('/api', generalApiLimiter);
app.use('/api/auth', authLimiter, authRoutes);

// API Routes
app.use('/api/businesses', businessRoutes);
app.use('/api/audit-logs', auditRoutes);

// All other routes require API key auth
app.use(apiKeyAuth);

app.use('/api/customers', customerRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/promotions', promotionRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
