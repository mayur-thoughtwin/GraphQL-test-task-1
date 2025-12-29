import { GraphQLError } from 'graphql';
import { Context } from '../../context';

// Helper to check employee access
const requireAuth = ({ user }: Context) => {
  if (!user) {
    throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return user;
};

const employeeIncludes = {
  user: true,
  subjects: { include: { subject: true } },
  attendance: true,
};

export const employeeResolvers = {
  Query: {
    employee: async (_: any, { id }: { id: string }, ctx: Context) => {
      const user = requireAuth(ctx);
      const { prisma } = ctx;

      // Employees can only view their own profile, admins can view any
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: employeeIncludes,
      });

      if (!employee) return null;

      // Check if user is viewing their own profile or is admin
      if (user.role !== 'ADMIN' && employee.userId !== user.id) {
        throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
      }

      return employee;
    },

    attendanceByEmployee: async (_: any, { employeeId, startDate, endDate }: any, ctx: Context) => {
      const user = requireAuth(ctx);
      const { prisma } = ctx;

      // Check if user is viewing their own attendance or is admin
      if (user.role !== 'ADMIN') {
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee || employee.userId !== user.id) {
          throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
        }
      }

      const where: any = { employeeId };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      return prisma.attendance.findMany({
        where,
        include: { employee: true },
        orderBy: { date: 'desc' },
      });
    },
  },

  // Field resolvers
  Employee: {
    subjects: (parent: any) => parent.subjects?.map((es: any) => es.subject) || [],
  },

  Subject: {
    employees: (parent: any) => parent.employees?.map((es: any) => es.employee) || [],
  },
};
