import { PrismaClient } from '@prisma/client';
import prisma from './prisma/client';
import { createDataLoaders, DataLoaders } from './dataloaders';

export interface UserPayload {
  id: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export interface Context {
  prisma: PrismaClient;
  user: UserPayload | null;
  loaders: DataLoaders;
}

export const createContext = (user: UserPayload | null): Context => {
  return {
    prisma,
    user,
    loaders: createDataLoaders(prisma),
  };
};
