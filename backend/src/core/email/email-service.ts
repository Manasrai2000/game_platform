import nodemailer, { Transporter } from "nodemailer";
import { env } from "../config/env";

export class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    if (env.MAIL_USER && env.MAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.MAIL_HOST,
        port: env.MAIL_PORT,
        secure: env.MAIL_PORT === 465,
        auth: {
          user: env.MAIL_USER,
          pass: env.MAIL_PASS,
        },
      });
    }
  }

  /**
   * Verify SMTP connection status.
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.verify();
      return true;
    } catch (err) {
      console.error("❌ EmailService connection verification failed:", err);
      return false;
    }
  }

  /**
   * Send an OTP verification email to student/user.
   */
  async sendOtpEmail(to: string, otp: string, recipientName = "Student"): Promise<boolean> {
    if (!this.transporter) {
      console.warn("⚠️ EmailService transporter not configured. OTP was:", otp);
      return false;
    }

    const mailOptions = {
      from: env.MAIL_FROM,
      to,
      subject: `Your Verification Code: ${otp} - Education Game Platform`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }
            .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
            .content { padding: 32px 24px; color: #1e293b; text-align: center; }
            .content p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
            .otp-box { display: inline-block; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 14px 28px; font-size: 32px; font-weight: 800; font-family: monospace; letter-spacing: 6px; color: #4f46e5; margin: 12px 0 24px; }
            .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Education Game Platform</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${recipientName}</strong>,</p>
              <p>Please use the verification code below to complete your authentication. This code is valid for 10 minutes.</p>
              <div class="otp-box">${otp}</div>
              <p style="font-size: 12px; color: #64748b;">If you did not request this verification code, please ignore this email.</p>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Education Game Platform. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("❌ Failed to send OTP email to", to, error);
      return false;
    }
  }
}

export const emailService = new EmailService();
