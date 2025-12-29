import jwt from 'jsonwebtoken';
import { UserPayload } from '../context';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const getUserFromToken = (token: string | undefined): UserPayload | null => {
  if (!token) return null;

  try {
    // Remove 'Bearer ' prefix if present
    const actualToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const decoded = jwt.verify(actualToken, JWT_SECRET) as {
      userId: string;
      role: 'ADMIN' | 'EMPLOYEE';
    };

    return {
      id: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return null;
  }
};
