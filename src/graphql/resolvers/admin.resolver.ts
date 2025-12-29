import { GraphQLError } from 'graphql';
import { Context } from '../../context';

// Helper to check admin access
const requireAdmin = ({ user }: Context) => {
  if (!user) {
    throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  if (user.role !== 'ADMIN') {
    throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
  }
  return user;
};

// Common includes for employee queries
const employeeIncludes = {
  user: true,
  subjects: { include: { subject: true } },
  attendance: true,
};

const subjectIncludes = {
  employees: { include: { employee: true } },
};

export const adminResolvers = {
  Query: {
    employees: async (_: any, { filter, skip = 0, take = 10 }: any, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      const where: any = {};
      if (filter?.name) where.name = { contains: filter.name, mode: 'insensitive' };
      if (filter?.age !== undefined) where.age = filter.age;
      if (filter?.class) where.class = filter.class;
      if (filter?.isActive !== undefined) where.isActive = filter.isActive;

      return prisma.employee.findMany({ where, skip, take, include: employeeIncludes });
    },

    subjects: async (_: any, __: any, ctx: Context) => {
      requireAdmin(ctx);
      return ctx.prisma.subject.findMany({ include: subjectIncludes });
    },

    subject: async (_: any, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);
      return ctx.prisma.subject.findUnique({ where: { id }, include: subjectIncludes });
    },
  },

  Mutation: {
    createEmployee: async (_: any, { input }: { input: any }, ctx: Context) => {
      const user = requireAdmin(ctx);
      const { prisma } = ctx;

      return prisma.employee.create({
        data: {
          userId: user.id,
          name: input.name,
          age: input.age,
          class: input.class,
          subjects: input.subjectIds?.length
            ? { create: input.subjectIds.map((subjectId: string) => ({ subjectId })) }
            : undefined,
        },
        include: employeeIncludes,
      });
    },

    updateEmployee: async (_: any, { id, input }: { id: string; input: any }, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      if (input.subjectIds) {
        await prisma.employeeSubject.deleteMany({ where: { employeeId: id } });
        await prisma.employeeSubject.createMany({
          data: input.subjectIds.map((subjectId: string) => ({ employeeId: id, subjectId })),
        });
      }

      const { subjectIds: _subjectIds, ...updateData } = input;
      return prisma.employee.update({ where: { id }, data: updateData, include: employeeIncludes });
    },

    deleteEmployee: async (_: any, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);
      await ctx.prisma.employee.delete({ where: { id } });
      return true;
    },

    createSubject: async (_: any, { input }: { input: any }, ctx: Context) => {
      requireAdmin(ctx);
      return ctx.prisma.subject.create({ data: { name: input.name }, include: subjectIncludes });
    },

    deleteSubject: async (_: any, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);
      await ctx.prisma.subject.delete({ where: { id } });
      return true;
    },

    markAttendance: async (_: any, { input }: { input: any }, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;
      const { employeeId, date, status } = input;

      return prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date: new Date(date) } },
        update: { status },
        create: { employeeId, date: new Date(date), status },
        include: { employee: true },
      });
    },
  },
};
