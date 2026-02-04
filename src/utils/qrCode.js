const QRCode = require('qrcode');

/**
 * Generate QR code as data URL
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<string>} - Data URL of QR code
 */
const generateQRCode = async (text) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate QR code as PNG buffer
 * @param {string} text - Text to encode
 * @returns {Promise<Buffer>} - PNG buffer
 */
const generateQRCodeBuffer = async (text) => {
  try {
    const buffer = await QRCode.toBuffer(text, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate QR code buffer: ${error.message}`);
  }
};

module.exports = {
  generateQRCode,
  generateQRCodeBuffer,
};
