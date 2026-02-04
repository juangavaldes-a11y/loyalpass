// Simple logger implementation (winston is optional)
// If you want to use winston, uncomment the code below and install: npm install winston

/*
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

module.exports = logger;
*/

// Simple built-in logger
const logger = {
  info: (message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  },
  error: (message, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  },
  warn: (message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  },
  debug: (message, data) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  },
};

module.exports = logger;
