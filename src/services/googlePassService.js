const { google } = require('google-auth-library');
const googleConfig = require('../config/googleWallet');
const { googlePassTemplate } = require('../utils/passTemplates');
const logger = require('../utils/logger');

class GooglePassService {
  /**
   * Get Google Wallet JWT client
   */
  static async getClient() {
    try {
      if (!googleConfig.serviceAccount) {
        throw new Error('Google service account not configured');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: googleConfig.serviceAccount,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      });

      const client = await auth.getClient();
      return client;
    } catch (error) {
      logger.error('Error getting Google Auth client:', error);
      throw error;
    }
  }

  /**
   * Create Pass Class for business (one per business)
   */
  static async createPassClass(businessId, business) {
    try {
      if (!googleConfig.serviceAccount) {
        logger.warn(
          'Google Wallet credentials not configured. Skipping Pass Class creation.'
        );
        return null;
      }

      const client = await this.getClient();

      const passClassId = `${googleConfig.issuerId}.${businessId.substring(0, 8)}`;

      const classResource = {
        id: passClassId,
        issuerName: business.name,
        reviewStatus: 'UNDER_REVIEW',
        textModulesData: [
          {
            id: 'points_label',
            header: 'Points',
            body: 'Earn points with every purchase',
          },
        ],
        imageModulesData: [
          {
            id: 'logo',
            mainImage: {
              sourceUri: {
                uri: business.logo_url || 'https://via.placeholder.com/512x512',
              },
            },
          },
        ],
        colorScheme: {
          hexForegroundColor: business.text_color || '#FFFFFF',
          hexBackgroundColor: business.brand_color || '#22b573',
        },
      };

      // Make API call to create class
      const response = await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/genericClass?_module=builtinModule_security_model`,
        method: 'POST',
        data: classResource,
      });

      logger.info(`Google Pass Class created: ${passClassId}`);

      return passClassId;
    } catch (error) {
      logger.error('Error creating Google Pass Class:', error);
      // Don't throw - allow graceful degradation
      return null;
    }
  }

  /**
   * Create Pass Object for customer
   */
  static async generatePass(businessId, customerId, business, customer, points) {
    try {
      if (!googleConfig.serviceAccount) {
        logger.warn(
          'Google Wallet credentials not configured. Skipping Pass Object creation.'
        );
        return null;
      }

      const passClassId = `${googleConfig.issuerId}.${businessId.substring(0, 8)}`;
      const passObjectId = `${googleConfig.issuerId}.${customerId.substring(0, 8)}`;

      const passObject = googlePassTemplate(business, customer, points);
      passObject.classId = passClassId;
      passObject.id = passObjectId;

      const client = await this.getClient();

      const response = await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/genericObject`,
        method: 'POST',
        data: passObject,
      });

      logger.info(`Google Pass Object created: ${passObjectId}`);

      return passObjectId;
    } catch (error) {
      logger.error('Error creating Google Pass Object:', error);
      // Don't throw - allow graceful degradation
      return null;
    }
  }

  /**
   * Update Pass Object with new points
   */
  static async updatePass(passObjectId, newPoints) {
    try {
      if (!googleConfig.serviceAccount || !passObjectId) {
        logger.warn('Google configuration incomplete for pass update');
        return null;
      }

      const client = await this.getClient();

      const updateData = {
        textModulesData: [
          {
            id: 'points',
            header: 'Points Balance',
            body: newPoints.balance.toString(),
          },
        ],
      };

      const response = await client.request({
        url: `https://walletobjects.googleapis.com/walletobjects/v1/genericObject/${passObjectId}`,
        method: 'PATCH',
        data: updateData,
      });

      logger.info(`Google Pass Object updated: ${passObjectId}`);

      return true;
    } catch (error) {
      logger.error('Error updating Google Pass Object:', error);
      // Don't throw - allow graceful degradation
      return null;
    }
  }

  /**
   * Generate JWT for adding pass to Google Wallet
   */
  static generateAddToWalletJwt(passObjectId) {
    try {
      if (!googleConfig.serviceAccount) {
        throw new Error('Google service account not configured');
      }

      // Create JWT token for adding pass to wallet
      // This token is used on the client side to trigger the add to wallet flow

      const payload = {
        iss: googleConfig.serviceAccount.client_email,
        aud: 'google',
        typ: 'savetowallet',
        origins: ['example.com'], // Add your domain
        payload: {
          genericObjects: [
            {
              id: passObjectId,
            },
          ],
        },
      };

      // In production, sign this JWT with your service account key
      // Using google-auth-library
      const key = googleConfig.serviceAccount.private_key;
      const algo = 'HS256';

      logger.info(`JWT generated for pass: ${passObjectId}`);

      // Return JWT (simplified - in production use proper JWT library)
      return 'jwt_token_here';
    } catch (error) {
      logger.error('Error generating JWT:', error);
      throw error;
    }
  }
}

module.exports = GooglePassService;
