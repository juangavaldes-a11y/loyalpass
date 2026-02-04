/**
 * Apple Wallet Pass Template
 */
const applePassTemplate = (business, customer, points, qrCodeDataUrl) => {
  return {
    formatVersion: 1,
    description: `${business.name} Loyalty Card`,
    organizationName: business.name,
    logoText: business.name,
    backgroundColor: business.brand_color || 'rgb(54, 180, 107)',
    textColor: business.text_color || 'rgb(255, 255, 255)',
    labelColor: business.text_color || 'rgb(255, 255, 255)',

    // Barcode - QR code for scanning
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: customer.id, // Customer ID encoded in QR
        messageEncoding: 'iso-8859-1',
        altText: `Customer: ${customer.id}`,
      },
    ],

    // Primary field - Points balance
    primaryFields: [
      {
        key: 'points',
        label: 'Points',
        value: points.balance.toString(),
        textAlignment: 'PKTextAlignmentCenter',
        changeMessage: 'Points updated to %@',
      },
    ],

    // Secondary fields
    secondaryFields: [
      {
        key: 'customerName',
        label: 'Member',
        value: customer.name,
      },
    ],

    // Auxiliary fields
    auxiliaryFields: [
      {
        key: 'businessName',
        label: 'Business',
        value: business.name,
      },
    ],

    // Footer
    backFields: [
      {
        key: 'instructions',
        label: 'How to use',
        value:
          'Show your pass at checkout. Points are automatically added to your account.',
      },
    ],
  };
};

/**
 * Google Wallet Pass Template
 */
const googlePassTemplate = (business, customer, points) => {
  return {
    id: `${customer.id}`,
    classId: `${business.id}`,
    state: 'ACTIVE',
    heroImage: {
      sourceUri: {
        uri: business.logo_url || 'https://via.placeholder.com/512x512',
      },
    },
    textModulesData: [
      {
        id: 'points',
        header: 'Points Balance',
        body: points.balance.toString(),
      },
    ],
    barcode: {
      type: 'QR_CODE',
      value: customer.id,
    },
  };
};

module.exports = {
  applePassTemplate,
  googlePassTemplate,
};
