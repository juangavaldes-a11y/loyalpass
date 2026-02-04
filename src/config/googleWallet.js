const fs = require('fs');
const config = require('./env');

// Google Wallet Configuration
let googleServiceAccount = null;

if (config.google.serviceAccountKeyPath) {
  const keyContent = fs.readFileSync(config.google.serviceAccountKeyPath, 'utf-8');
  googleServiceAccount = JSON.parse(keyContent);
}

const googleConfig = {
  projectId: config.google.projectId || googleServiceAccount?.project_id,
  serviceAccount: googleServiceAccount,
  issuerId: process.env.GOOGLE_ISSUER_ID || '3388000000022876589', // Your numeric issuer ID
};

module.exports = googleConfig;
