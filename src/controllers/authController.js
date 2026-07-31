const AuthService = require('../services/authService');
const AuditService = require('../services/auditService');

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      const result = await AuthService.authenticate(email, password);
      if (!result) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      await AuditService.log({
        actorType: 'user',
        actorId: result.user.id,
        action: 'auth.login',
        entityType: 'portal_user',
        entityId: result.user.id,
        metadata: { role: result.user.role },
      });

      return res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          role: result.user.role,
          businessId: result.user.business_id || '',
          apiKey: result.user.apiKey || null,
          email: result.user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
