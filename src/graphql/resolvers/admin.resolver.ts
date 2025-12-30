import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { validateInput, validateId } from '../../validation/validate';
import {
  createEmployeeInputSchema,
  updateEmployeeInputSchema,
  createSubjectInputSchema,
  markAttendanceInputSchema,
  employeeFilterSchema,
  paginationSchema,
} from '../../validation/schemas';

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
    employees: async (
      _: unknown,
      { filter, skip, take, sortBy, sortOrder }: Record<string, unknown>,
      ctx: Context
    ) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      // Validate filter if provided
      const validatedFilter = filter ? validateInput(employeeFilterSchema, filter) : {};

      // Validate pagination
      const pagination = validateInput(paginationSchema, {
        skip: skip ?? 0,
        take: take ?? 10,
        sortBy: sortBy ?? 'createdAt',
        sortOrder: sortOrder ?? 'desc',
      });

      // Base filter - exclude employees linked to ADMIN users
      const where: Record<string, unknown> = {
        user: {
          role: 'EMPLOYEE', // Only include employees linked to EMPLOYEE role users
        },
      };
      
      if (validatedFilter.name) where.name = { contains: validatedFilter.name, mode: 'insensitive' };
      if (validatedFilter.age !== undefined) where.age = validatedFilter.age;
      if (validatedFilter.class) where.class = validatedFilter.class;
      if (validatedFilter.isActive !== undefined) where.isActive = validatedFilter.isActive;

      const [employees, totalCount] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip: pagination.skip,
          take: pagination.take,
          orderBy: { [pagination.sortBy]: pagination.sortOrder },
          include: employeeIncludes,
        }),
        prisma.employee.count({ where }),
      ]);

      return {
        employees,
        totalCount,
        hasNextPage: pagination.skip + pagination.take < totalCount,
        hasPreviousPage: pagination.skip > 0,
      };
    },

    subjects: async (_: unknown, __: unknown, ctx: Context) => {
      requireAdmin(ctx);
      return ctx.prisma.subject.findMany({ include: subjectIncludes });
    },

    subject: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);
      validateId(id, 'subject ID');
      return ctx.prisma.subject.findUnique({ where: { id }, include: subjectIncludes });
    },

    usersWithoutEmployees: async (_: unknown, __: unknown, ctx: Context) => {
      requireAdmin(ctx);
      return ctx.prisma.user.findMany({
        where: { 
          employee: null,
          role: 'EMPLOYEE'  // Only return users with EMPLOYEE role, not ADMIN
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    createEmployee: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      // Validate input
      const validatedInput = validateInput(createEmployeeInputSchema, input);

      // Check if user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: validatedInput.userId },
        include: { employee: true },
      });

      if (!targetUser) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check if user already has an employee record
      if (targetUser.employee) {
        throw new GraphQLError('User already has an employee record', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Check if subject IDs exist
      if (validatedInput.subjectIds?.length) {
        const subjects = await prisma.subject.findMany({
          where: { id: { in: validatedInput.subjectIds } },
          select: { id: true },
        });
        const foundIds = new Set(subjects.map((s) => s.id));
        const invalidIds = validatedInput.subjectIds.filter((id) => !foundIds.has(id));
        if (invalidIds.length) {
          throw new GraphQLError(`Invalid subject IDs: ${invalidIds.join(', ')}`, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
      }

      return prisma.employee.create({
        data: {
          userId: validatedInput.userId,
          name: validatedInput.name,
          age: validatedInput.age,
          class: validatedInput.class,
          subjects: validatedInput.subjectIds?.length
            ? { create: validatedInput.subjectIds.map((subjectId: string) => ({ subjectId })) }
            : undefined,
        },
        include: employeeIncludes,
      });
    },

    updateEmployee: async (_: unknown, { id, input }: { id: string; input: unknown }, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      // Validate ID and input
      validateId(id, 'employee ID');
      const validatedInput = validateInput(updateEmployeeInputSchema, input);

      // Check if employee exists
      const existingEmployee = await prisma.employee.findUnique({ where: { id } });
      if (!existingEmployee) {
        throw new GraphQLError('Employee not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check if subject IDs exist
      if (validatedInput.subjectIds?.length) {
        const subjects = await prisma.subject.findMany({
          where: { id: { in: validatedInput.subjectIds } },
          select: { id: true },
        });
        const foundIds = new Set(subjects.map((s) => s.id));
        const invalidIds = validatedInput.subjectIds.filter((sid) => !foundIds.has(sid));
        if (invalidIds.length) {
          throw new GraphQLError(`Invalid subject IDs: ${invalidIds.join(', ')}`, {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        await prisma.employeeSubject.deleteMany({ where: { employeeId: id } });
        await prisma.employeeSubject.createMany({
          data: validatedInput.subjectIds.map((subjectId: string) => ({ employeeId: id, subjectId })),
        });
      }

      const { subjectIds: _subjectIds, ...updateData } = validatedInput;
      return prisma.employee.update({ where: { id }, data: updateData, include: employeeIncludes });
    },

    deleteEmployee: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);

      // Validate ID
      validateId(id, 'employee ID');

      // Check if employee exists
      const existingEmployee = await ctx.prisma.employee.findUnique({ where: { id } });
      if (!existingEmployee) {
        throw new GraphQLError('Employee not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await ctx.prisma.employee.delete({ where: { id } });
      return true;
    },

    createSubject: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      requireAdmin(ctx);

      // Validate input
      const validatedInput = validateInput(createSubjectInputSchema, input);

      // Check if subject name already exists
      const existing = await ctx.prisma.subject.findUnique({
        where: { name: validatedInput.name },
      });
      if (existing) {
        throw new GraphQLError('Subject with this name already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return ctx.prisma.subject.create({
        data: { name: validatedInput.name },
        include: subjectIncludes,
      });
    },

    deleteSubject: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      requireAdmin(ctx);

      // Validate ID
      validateId(id, 'subject ID');

      // Check if subject exists
      const existingSubject = await ctx.prisma.subject.findUnique({ where: { id } });
      if (!existingSubject) {
        throw new GraphQLError('Subject not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      await ctx.prisma.subject.delete({ where: { id } });
      return true;
    },

    markAttendance: async (_: unknown, { input }: { input: unknown }, ctx: Context) => {
      requireAdmin(ctx);
      const { prisma } = ctx;

      // Validate input
      const validatedInput = validateInput(markAttendanceInputSchema, input);
      const { employeeId, date, status } = validatedInput;

      // Check if employee exists
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) {
        throw new GraphQLError('Employee not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return prisma.attendance.upsert({
        where: { employeeId_date: { employeeId, date: new Date(date) } },
        update: { status },
        create: { employeeId, date: new Date(date), status },
        include: { employee: true },
      });
    },
  },
};
