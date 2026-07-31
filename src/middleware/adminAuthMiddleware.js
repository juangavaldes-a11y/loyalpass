const AuthService = require('../services/authService');
const logger = require('../utils/logger');

const adminAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization bearer token is required',
      });
    }

    const session = await AuthService.verifyToken(token);
    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    req.user = session;
    req.businessId = session.businessId || null;
    req.isPlatformAdmin = session.role === 'platform_admin';

    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

module.exports = adminAuth;
