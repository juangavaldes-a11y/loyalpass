const fs = require('fs');
const config = require('./env');

// Apple Wallet Configuration
const appleConfig = {
  teamId: config.apple.teamId,
  keyId: config.apple.keyId,
  certificate: config.apple.certificatePath
    ? fs.readFileSync(config.apple.certificatePath, 'utf-8')
    : null,
  passTypeId: 'pass.com.loyalpass.customer', // Format: pass.REVERSE_DOMAIN.IDENTIFIER
};

module.exports = appleConfig;
