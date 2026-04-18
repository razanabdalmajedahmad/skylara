/**
 * Email interface for storing sent emails
 */
export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  html: string;
  type: 'welcome' | 'loginAlert' | 'passwordReset' | 'passwordChanged' | 'notification';
  timestamp: Date;
  metadata?: Record<string, any>;
  providerMessageId?: string;
}

/**
 * In-memory storage for sent emails (for dev access and logging)
 */
const sentEmails: SentEmail[] = [];

/**
 * Get environment variables
 */
const isDevelopment = process.env.NODE_ENV !== 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const appName = 'SkyLara';

/**
 * Send email via SendGrid API.
 *
 * Production: Uses @sendgrid/mail SDK (configured via SENDGRID_API_KEY env var).
 * Development: Logs to console when no API key is configured.
 */
let sgMail: any = null;

// Initialize SendGrid SDK if API key is available
function initSendGrid(): void {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey || sgMail) return;

  try {
    sgMail = require("@sendgrid/mail");
    sgMail.setApiKey(apiKey);
    console.log("[EMAIL SERVICE] SendGrid SDK initialized");
  } catch (err) {
    console.log("[EMAIL SERVICE] @sendgrid/mail not available — emails will log to console");
  }
}

// Auto-init on module load
initSendGrid();

/**
 * Send email via SendGrid API.
 * Returns the provider message ID on success, or undefined if no provider configured.
 */
export async function sendEmailViaProvider(
  to: string,
  subject: string,
  html: string,
  from: string
): Promise<string | undefined> {
  // SendGrid API
  if (sgMail) {
    const [response] = await sgMail.send({
      to,
      from: from || process.env.SENDGRID_FROM_EMAIL || `noreply@skylara.app`,
      subject,
      html,
    });

    const messageId = response?.headers?.["x-message-id"] || `sg_${Date.now()}`;
    console.log(`[EMAIL SERVICE] Email sent via SendGrid to ${to} (messageId: ${messageId})`);
    return messageId;
  }

  console.log(`[EMAIL SERVICE] No email provider configured. Email not sent to ${to}`);
  return undefined;
}

/**
 * Send an email (logs in dev, sends in production)
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  type: 'welcome' | 'loginAlert' | 'passwordReset' | 'passwordChanged',
  metadata?: Record<string, any>
): Promise<void> {
  // Generate unique ID for tracking
  const emailId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Store in memory
  const emailRecord: SentEmail = {
    id: emailId,
    to,
    subject,
    html,
    type,
    timestamp: new Date(),
    metadata,
  };
  sentEmails.push(emailRecord);

  // Keep only the last 1000 emails in memory
  if (sentEmails.length > 1000) {
    sentEmails.shift();
  }

  if (isDevelopment) {
    // Development: Log to console
    console.log(`\n[EMAIL SERVICE - DEV MODE]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Type: ${type}`);
    console.log(`ID: ${emailId}`);
    console.log(`\n${html}\n`);
    return;
  }

  // Production: Attempt to send via SMTP/SendGrid
  try {
    const fromEmail = process.env.SMTP_FROM_EMAIL || `noreply@${process.env.APP_DOMAIN || 'skylara.app'}`;
    await sendEmailViaProvider(to, subject, html, fromEmail);
    console.log(`[EMAIL SERVICE] Email queued for delivery to ${to}`);
  } catch (error) {
    console.error(`[EMAIL SERVICE] Error sending email to ${to}:`, error);
    // Don't throw - email failures shouldn't break the app
  }
}

/**
 * Build responsive email wrapper HTML
 */
function buildEmailTemplate(
  title: string,
  content: string,
  ctaButton?: { text: string; url: string }
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }

    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      padding: 40px 20px;
      text-align: center;
      color: white;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .header p {
      font-size: 14px;
      opacity: 0.9;
    }

    .content {
      padding: 40px 30px;
    }

    .content h2 {
      font-size: 22px;
      margin-bottom: 20px;
      color: #0ea5e9;
    }

    .content p {
      margin-bottom: 16px;
      line-height: 1.7;
      color: #555;
    }

    .cta-button {
      display: inline-block;
      margin: 30px 0;
      padding: 14px 32px;
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(14, 165, 233, 0.3);
    }

    .info-box {
      background-color: #f0f9ff;
      border-left: 4px solid #0ea5e9;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }

    .info-box p {
      margin-bottom: 0;
      color: #0c5a7f;
      font-size: 14px;
    }

    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer p {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }

    .footer a {
      color: #0ea5e9;
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    .divider {
      height: 1px;
      background-color: #e5e7eb;
      margin: 30px 0;
    }

    @media (max-width: 600px) {
      .container {
        width: 100%;
      }

      .content {
        padding: 25px 20px;
      }

      .header h1 {
        font-size: 24px;
      }

      .content h2 {
        font-size: 18px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈️ ${appName}</h1>
      <p>Sky diving operations platform</p>
    </div>

    <div class="content">
      ${content}
      ${ctaButton ? `<a href="${ctaButton.url}" class="cta-button">${ctaButton.text}</a>` : ''}
    </div>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>
        <a href="${frontendUrl}">Visit ${appName}</a> &middot;
        <a href="${frontendUrl}/privacy">Privacy</a> &middot;
        <a href="${frontendUrl}/contact">Contact</a>
      </p>
      <p style="margin-top: 15px; font-size: 11px; color: #999;">
        If you did not request this email, please ignore it.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const subject = `Welcome to ${appName}!`;

  const content = `
    <h2>Welcome to ${appName}, ${firstName}!</h2>
    <p>We're excited to have you on board. ${appName} is your sky diving operations platform—designed to make managing jumps, gear, and safety a breeze.</p>

    <div class="info-box">
      <p><strong>Quick Tip:</strong> Complete your profile to get started and access all features.</p>
    </div>

    <p>Here's what you can do:</p>
    <ul style="margin: 15px 0; padding-left: 20px;">
      <li>Track jump history and statistics</li>
      <li>Manage your gear inventory</li>
      <li>Check weather and conditions</li>
      <li>Log safety checks and incidents</li>
      <li>Collaborate with other sky divers</li>
    </ul>

    <p>If you have any questions or need support, don't hesitate to reach out to our team.</p>
    <p>Happy jumping!</p>
  `;

  const html = buildEmailTemplate(
    `Welcome to ${appName}`,
    content,
    {
      text: 'Get Started',
      url: `${frontendUrl}/dashboard`,
    }
  );

  await sendEmail(to, subject, html, 'welcome', { firstName });
}

/**
 * Send login alert email
 */
export async function sendLoginAlertEmail(
  to: string,
  firstName: string,
  ip: string,
  userAgent: string
): Promise<void> {
  const subject = `New Login to Your ${appName} Account`;

  // Parse user agent for display
  const getBrowserInfo = (ua: string) => {
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Mobile')) return 'Mobile Browser';
    return 'Unknown Browser';
  };

  const getOSInfo = (ua: string) => {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iPhone')) return 'iOS';
    if (ua.includes('Android')) return 'Android';
    return 'Unknown OS';
  };

  const browser = getBrowserInfo(userAgent);
  const os = getOSInfo(userAgent);

  const content = `
    <h2>New Login Detected</h2>
    <p>Hi ${firstName},</p>
    <p>We detected a new login to your ${appName} account. Here are the details:</p>

    <div class="info-box">
      <p><strong>Device:</strong> ${browser} on ${os}</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p>If this wasn't you, please <a href="${frontendUrl}/account/security" style="color: #0ea5e9; text-decoration: none;">review your account security</a> immediately and change your password.</p>

    <p>Your account security is important to us. If you suspect any unauthorized access, please contact our support team right away.</p>
  `;

  const html = buildEmailTemplate(
    `New ${appName} Login`,
    content,
    {
      text: 'Review Account Security',
      url: `${frontendUrl}/account/security`,
    }
  );

  await sendEmail(to, subject, html, 'loginAlert', { firstName, ip, userAgent });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetToken: string
): Promise<void> {
  const subject = `Reset Your ${appName} Password`;
  const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const content = `
    <h2>Password Reset Request</h2>
    <p>Hi ${firstName},</p>
    <p>We received a request to reset the password for your ${appName} account. Click the button below to set a new password.</p>

    <div class="info-box">
      <p><strong>Note:</strong> This link expires in 1 hour for security reasons.</p>
    </div>

    <p>The reset link is:</p>
    <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px; margin: 15px 0; border-radius: 4px; word-break: break-all;">
      <code style="font-size: 12px; color: #0c5a7f;">
        ${resetUrl}
      </code>
    </div>

    <div class="divider"></div>

    <p style="color: #888; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  const html = buildEmailTemplate(
    `Reset Your ${appName} Password`,
    content,
    {
      text: 'Reset Password',
      url: resetUrl,
    }
  );

  await sendEmail(to, subject, html, 'passwordReset', { firstName, resetTokenHash: resetToken.substring(0, 10) });
}

/**
 * Send password changed confirmation email
 */
export async function sendPasswordChangedEmail(to: string, firstName: string): Promise<void> {
  const subject = `Your ${appName} Password Has Been Changed`;

  const content = `
    <h2>Password Changed Successfully</h2>
    <p>Hi ${firstName},</p>
    <p>Your ${appName} account password was successfully changed on ${new Date().toLocaleString()}.</p>

    <div class="info-box">
      <p><strong>Security Tip:</strong> If you didn't make this change, please <a href="${frontendUrl}/account/security" style="color: #0c5a7f; text-decoration: underline;">contact support immediately</a>.</p>
    </div>

    <p>Your account is now secure with your new password. You can continue using ${appName} as usual.</p>

    <p style="color: #888; font-size: 14px; margin-top: 20px;">
      All previous sessions have been logged out. You'll need to log in again with your new password on any other devices or browsers.
    </p>
  `;

  const html = buildEmailTemplate(
    `${appName} Password Changed`,
    content,
    {
      text: 'View Account Settings',
      url: `${frontendUrl}/account/settings`,
    }
  );

  await sendEmail(to, subject, html, 'passwordChanged', { firstName });
}

/**
 * Get all sent emails (dev access)
 */
export function getSentEmails(): SentEmail[] {
  return [...sentEmails];
}

/**
 * Clear sent emails (for testing)
 */
export function clearSentEmails(): void {
  sentEmails.length = 0;
}

/**
 * Get email by ID (dev access)
 */
export function getEmailById(id: string): SentEmail | undefined {
  return sentEmails.find(email => email.id === id);
}

/**
 * Get emails by recipient (dev access)
 */
export function getEmailsByRecipient(to: string): SentEmail[] {
  return sentEmails.filter(email => email.to === to);
}

/**
 * Get emails by type (dev access)
 */
export function getEmailsByType(type: SentEmail['type']): SentEmail[] {
  return sentEmails.filter(email => email.type === type);
}

/**
 * Export email service as singleton
 */
export const emailService = {
  sendWelcomeEmail,
  sendLoginAlertEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  getSentEmails,
  clearSentEmails,
  getEmailById,
  getEmailsByRecipient,
  getEmailsByType,
};
