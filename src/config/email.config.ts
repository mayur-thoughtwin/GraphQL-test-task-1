import dotenv from 'dotenv';

dotenv.config();

interface EmailConfig {
  service: string;
  user: string;
  password: string;
  fromName: string;
  pool: {
    maxConnections: number;
    rateDelta: number;
    rateLimit: number;
  };
}

const getEmailConfig = (): EmailConfig => {
  const user = process.env.EMAIL_USER;
  const password = process.env.EMAIL_PASS;

  if (!user || !password) {
    console.warn('⚠️ Email credentials not found in environment variables');
  }

  return {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: user || '',
    password: password || '',
    fromName: process.env.EMAIL_FROM_NAME || 'Employee Portal',
    pool: {
      maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10),
      rateDelta: parseInt(process.env.EMAIL_RATE_DELTA || '1000', 10),
      rateLimit: parseInt(process.env.EMAIL_RATE_LIMIT || '5', 10),
    },
  };
};

export const emailConfig = getEmailConfig();
export type { EmailConfig };
