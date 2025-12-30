import nodemailer from "nodemailer";
import { emailConfig } from "../config/email.config";

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: emailConfig.service,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.password,
  },
  pool: true,
  maxConnections: emailConfig.pool.maxConnections,
  rateDelta: emailConfig.pool.rateDelta,
  rateLimit: emailConfig.pool.rateLimit,
});

// Generate a random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Calculate OTP expiry time (10 minutes from now)
export const getOTPExpiry = (): Date => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
};

// Verify if OTP is still valid (not expired)
export const isOTPValid = (expiryTime: Date): boolean => {
  return new Date() < new Date(expiryTime);
};

// Send OTP email
export const sendOTPEmail = async (
  email: string,
  otp: string
): Promise<boolean> => {
  const mailOptions = {
    from: `"${emailConfig.fromName}" <${emailConfig.user}>`,
    to: email,
    subject: "🔐 Your Email Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 40px; box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="width: 64px; height: 64px; border-radius: 12px; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);">
                <span style="color: white; font-size: 28px; font-weight: 700;">E</span>
              </div>
              <h1 style="color: #f8fafc; margin: 24px 0 8px 0; font-size: 24px; font-weight: 700;">Email Verification</h1>
              <p style="color: #94a3b8; margin: 0; font-size: 16px;">Employee Portal</p>
            </div>
            
            <!-- Content -->
            <div style="background: rgba(15, 23, 42, 0.5); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
              <p style="color: #cbd5e1; margin: 0 0 16px 0; font-size: 16px;">Use this code to verify your email address:</p>
              <div style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 8px; padding: 20px 40px; display: inline-block;">
                <span style="color: white; font-size: 36px; font-weight: 700; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="color: #64748b; margin: 20px 0 0 0; font-size: 14px;">
                ⏱️ This code expires in <strong style="color: #10b981;">10 minutes</strong>
              </p>
            </div>
            
            <!-- Warning -->
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #fca5a5; margin: 0; font-size: 14px; text-align: center;">
                ⚠️ If you didn't request this code, please ignore this email.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(148, 163, 184, 0.1);">
              <p style="color: #64748b; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} Employee Portal. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your Email Verification Code: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error("Failed to send OTP email. Please try again.");
  }
};

// Verify transporter connection
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("✅ Email service connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Email service connection failed:", error);
    return false;
  }
};

