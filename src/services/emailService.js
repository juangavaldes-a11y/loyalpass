const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter;

function getTransporter() {
  if (!config.smtp.host || !config.smtp.from) {
    throw new Error('SMTP_HOST and SMTP_FROM are required to send email');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.password } : undefined,
    });
  }

  return transporter;
}

class EmailService {
  static async send({ to, subject, text, html, replyTo }) {
    if (!to || !subject || (!text && !html)) {
      throw new Error('Email recipient, subject, and content are required');
    }

    return getTransporter().sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
      html,
      replyTo,
    });
  }

  static async sendBusinessOwnerInvite({ to, businessName, temporaryPassword }) {
    return this.send({
      to,
      subject: `Your ${businessName} LoyalPass account`,
      text: `Your account for ${businessName} is ready. Sign in and change your temporary password: ${temporaryPassword}`,
      html: `<p>Your account for <strong>${businessName}</strong> is ready.</p><p>Sign in and change your temporary password: <strong>${temporaryPassword}</strong></p>`,
    });
  }
}

module.exports = EmailService;