import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../../context';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to check if user is authenticated
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new GraphQLError('You must be logged in', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
};

// Helper to check if user is admin
const requireAdmin = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== 'ADMIN') {
    throw new GraphQLError('You must be an admin to perform this action', {
      extensions: { code: 'FORBIDDEN' },
    });
  }
  return user;
};

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      const user = requireAuth(context);
      return context.prisma.user.findUnique({
        where: { id: user.id },
        include: { employee: true },
      });
    },

    employees: async (
      _: any,
      { filter, skip = 0, take = 10 }: { filter?: any; skip?: number; take?: number },
      context: Context
    ) => {
      requireAuth(context);
      
      const where: any = {};
      if (filter) {
        if (filter.name) where.name = { contains: filter.name, mode: 'insensitive' };
        if (filter.age !== undefined) where.age = filter.age;
        if (filter.class) where.class = filter.class;
        if (filter.isActive !== undefined) where.isActive = filter.isActive;
      }

      return context.prisma.employee.findMany({
        where,
        skip,
        take,
        include: {
          user: true,
          subjects: { include: { subject: true } },
          attendance: true,
        },
      });
    },

    employee: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context);
      return context.prisma.employee.findUnique({
        where: { id },
        include: {
          user: true,
          subjects: { include: { subject: true } },
          attendance: true,
        },
      });
    },

    subjects: async (_: any, __: any, context: Context) => {
      requireAuth(context);
      return context.prisma.subject.findMany({
        include: {
          employees: { include: { employee: true } },
        },
      });
    },

    subject: async (_: any, { id }: { id: string }, context: Context) => {
      requireAuth(context);
      return context.prisma.subject.findUnique({
        where: { id },
        include: {
          employees: { include: { employee: true } },
        },
      });
    },

    attendanceByEmployee: async (
      _: any,
      { employeeId, startDate, endDate }: { employeeId: string; startDate?: string; endDate?: string },
      context: Context
    ) => {
      requireAuth(context);
      
      const where: any = { employeeId };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      return context.prisma.attendance.findMany({
        where,
        include: { employee: true },
        orderBy: { date: 'desc' },
      });
    },
  },

  Mutation: {
    register: async (_: any, { input }: { input: any }, context: Context) => {
      const { email, password, role = 'EMPLOYEE' } = input;

      const existingUser = await context.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await context.prisma.user.create({
        data: {
          email,
          passwordHash,
          role,
        },
      });

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return { token, user };
    },

    login: async (_: any, { input }: { input: any }, context: Context) => {
      const { email, password } = input;

      const user = await context.prisma.user.findUnique({
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

    createEmployee: async (_: any, { input }: { input: any }, context: Context) => {
      const user = requireAdmin(context);

      const employee = await context.prisma.employee.create({
        data: {
          userId: user.id,
          name: input.name,
          age: input.age,
          class: input.class,
          subjects: input.subjectIds
            ? {
                create: input.subjectIds.map((subjectId: string) => ({
                  subjectId,
                })),
              }
            : undefined,
        },
        include: {
          user: true,
          subjects: { include: { subject: true } },
          attendance: true,
        },
      });

      return employee;
    },

    updateEmployee: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: Context
    ) => {
      requireAdmin(context);

      // Handle subject updates separately if provided
      if (input.subjectIds) {
        // Remove existing subjects
        await context.prisma.employeeSubject.deleteMany({
          where: { employeeId: id },
        });

        // Add new subjects
        await context.prisma.employeeSubject.createMany({
          data: input.subjectIds.map((subjectId: string) => ({
            employeeId: id,
            subjectId,
          })),
        });
      }

      const { subjectIds, ...updateData } = input;

      return context.prisma.employee.update({
        where: { id },
        data: updateData,
        include: {
          user: true,
          subjects: { include: { subject: true } },
          attendance: true,
        },
      });
    },

    deleteEmployee: async (_: any, { id }: { id: string }, context: Context) => {
      requireAdmin(context);

      await context.prisma.employee.delete({
        where: { id },
      });

      return true;
    },

    createSubject: async (_: any, { input }: { input: any }, context: Context) => {
      requireAdmin(context);

      return context.prisma.subject.create({
        data: { name: input.name },
        include: {
          employees: { include: { employee: true } },
        },
      });
    },

    deleteSubject: async (_: any, { id }: { id: string }, context: Context) => {
      requireAdmin(context);

      await context.prisma.subject.delete({
        where: { id },
      });

      return true;
    },

    markAttendance: async (_: any, { input }: { input: any }, context: Context) => {
      requireAdmin(context);

      const { employeeId, date, status } = input;

      return context.prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId,
            date: new Date(date),
          },
        },
        update: { status },
        create: {
          employeeId,
          date: new Date(date),
          status,
        },
        include: { employee: true },
      });
    },
  },

  // Field resolvers for nested types
  Employee: {
    subjects: (parent: any) => {
      // Map EmployeeSubject to Subject
      return parent.subjects?.map((es: any) => es.subject) || [];
    },
  },

  Subject: {
    employees: (parent: any) => {
      // Map EmployeeSubject to Employee
      return parent.employees?.map((es: any) => es.employee) || [];
    },
  },
};

