import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../../context';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const authResolvers = {
  Query: {
    me: async (_: any, __: any, { prisma, user }: Context) => {
      if (!user) {
        throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      return prisma.user.findUnique({
        where: { id: user.id },
        include: { employee: true },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: any }, { prisma }: Context) => {
      const { email, password, role = 'EMPLOYEE' } = input;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, role },
      });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return { token, user };
    },

    login: async (_: any, { input }: { input: any }, { prisma }: Context) => {
      const { email, password } = input;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { employee: true },
      });

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return { token, user };
    },
  },
};

