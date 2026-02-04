const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const apiKeyAuth = require('./middleware/authMiddleware');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Routes
const businessRoutes = require('./routes/businessRoutes');
const customerRoutes = require('./routes/customerRoutes');
const passRoutes = require('./routes/passRoutes');
const pointsRoutes = require('./routes/pointsRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/businesses', businessRoutes);

// All other routes require API key auth
app.use(apiKeyAuth);

app.use('/api/customers', customerRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/points', pointsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
