import { PrismaClient } from '@prisma/client';
import prisma from './prisma/client';

export interface UserPayload {
  id: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export interface Context {
  prisma: PrismaClient;
  user: UserPayload | null;
}

export const createContext = (user: UserPayload | null): Context => {
  return {
    prisma,
    user,
  };
};

