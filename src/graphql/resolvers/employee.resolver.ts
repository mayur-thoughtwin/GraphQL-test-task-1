import { GraphQLError } from 'graphql';
import { Context } from '../../context';
import { validateInput, validateId } from '../../validation/validate';
import { attendanceQuerySchema, updateMyNameSchema } from '../../validation/schemas';
import { requireAuthAndVerified } from '../../utils/auth.utils';

const employeeIncludes = {
  user: true,
  subjects: { include: { subject: true } },
  attendance: true,
};

export const employeeResolvers = {
  Query: {
    employee: async (_: unknown, { id }: { id: string }, ctx: Context) => {
      // Check auth and OTP verification
      const user = await requireAuthAndVerified(ctx);
      const { prisma } = ctx;

      // Validate ID
      validateId(id, 'employee ID');

      // Employees can only view their own profile, admins can view any
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: employeeIncludes,
      });

      if (!employee) {
        throw new GraphQLError('Employee not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      // Check if user is viewing their own profile or is admin
      if (user.role !== 'ADMIN' && employee.userId !== user.id) {
        throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
      }

      return employee;
    },

    attendanceByEmployee: async (
      _: unknown,
      args: { employeeId: string; startDate?: string; endDate?: string },
      ctx: Context
    ) => {
      // Check auth and OTP verification
      const user = await requireAuthAndVerified(ctx);
      const { prisma } = ctx;

      // Validate input
      const validatedInput = validateInput(attendanceQuerySchema, args);
      const { employeeId, startDate, endDate } = validatedInput;

      // Check if user is viewing their own attendance or is admin
      if (user.role !== 'ADMIN') {
        const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee) {
          throw new GraphQLError('Employee not found', {
            extensions: { code: 'NOT_FOUND' },
          });
        }
        if (employee.userId !== user.id) {
          throw new GraphQLError('Access denied', { extensions: { code: 'FORBIDDEN' } });
        }
      }

      const where: Record<string, unknown> = { employeeId };
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.gte = new Date(startDate);
        if (endDate) dateFilter.lte = new Date(endDate);
        where.date = dateFilter;
      }

      return prisma.attendance.findMany({
        where,
        include: { employee: true },
        orderBy: { date: 'desc' },
      });
    },

    // My profile - for employees to easily get their own profile
    myProfile: async (_: unknown, __: unknown, ctx: Context) => {
      // Check auth and OTP verification
      const user = await requireAuthAndVerified(ctx);
      const { prisma } = ctx;

      const employee = await prisma.employee.findUnique({
        where: { userId: user.id },
        include: employeeIncludes,
      });

      return employee;
    },
  },

  Mutation: {
    // Update own name - accessible by both employees and admins
    // Admin: Can create/update their own profile
    // Employee: Can only update if profile exists (admin must create first)
    updateMyName: async (_: unknown, { input }: { input: { name: string } }, ctx: Context) => {
      // Check auth and OTP verification
      const user = await requireAuthAndVerified(ctx);
      const { prisma } = ctx;

      // Validate input
      const validatedInput = validateInput(updateMyNameSchema, input);

      try {
        // Find existing employee profile
        const existingEmployee = await prisma.employee.findUnique({
          where: { userId: user.id },
        });

        let employee;

        if (existingEmployee) {
          // Update existing profile (both Admin and Employee can do this)
          employee = await prisma.employee.update({
            where: { id: existingEmployee.id },
            data: { name: validatedInput.name },
            include: employeeIncludes,
          });
        } else {
          // Profile doesn't exist
          if (user.role === 'ADMIN') {
            // Admin can create their own profile
            employee = await prisma.employee.create({
              data: {
                userId: user.id,
                name: validatedInput.name,
              },
              include: employeeIncludes,
            });
          } else {
            // Employee cannot create their own profile - Admin must do it
            throw new GraphQLError('Employee profile not found. Please contact admin to create your profile.', {
              extensions: { code: 'NOT_FOUND' },
            });
          }
        }

        return employee;
      } catch (error) {
        console.error('updateMyName error:', error);
        if (error instanceof GraphQLError) {
          throw error;
        }
        throw new GraphQLError('Failed to update name. Please try again.', {
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
      }
    },
  },

  // Field resolvers using DataLoaders for optimal performance
  Employee: {
    user: async (parent: { userId: string }, _: unknown, ctx: Context) => {
      // Use DataLoader to batch load users
      return ctx.loaders.userLoader.load(parent.userId);
    },
    subjects: async (
      parent: { id: string; subjects?: Array<{ subject: unknown }> },
      _: unknown,
      ctx: Context
    ) => {
      // If subjects were already loaded (via include), use them
      if (parent.subjects) {
        return parent.subjects.map((es) => es.subject);
      }
      // Otherwise use DataLoader to batch load subjects
      return ctx.loaders.subjectsByEmployeeIdLoader.load(parent.id);
    },
    attendance: async (
      parent: { id: string; attendance?: unknown[] },
      _: unknown,
      ctx: Context
    ) => {
      // If attendance was already loaded (via include), use it
      if (parent.attendance) {
        return parent.attendance;
      }
      // Otherwise use DataLoader to batch load attendance
      return ctx.loaders.attendanceByEmployeeIdLoader.load(parent.id);
    },
  },

  User: {
    employee: async (parent: { id: string; employee?: unknown }, _: unknown, ctx: Context) => {
      // If employee was already loaded (via include), use it
      if (parent.employee !== undefined) {
        return parent.employee;
      }
      // Otherwise use DataLoader to batch load employee
      return ctx.loaders.employeeByUserIdLoader.load(parent.id);
    },
  },

  Subject: {
    employees: async (
      parent: { id: string; employees?: Array<{ employee: unknown }> },
      _: unknown,
      ctx: Context
    ) => {
      // If employees were already loaded (via include), use them
      if (parent.employees) {
        return parent.employees.map((es) => es.employee);
      }
      // Otherwise use DataLoader to batch load employees
      return ctx.loaders.employeesBySubjectIdLoader.load(parent.id);
    },
  },

  Attendance: {
    employee: async (
      parent: { employeeId: string; employee?: unknown },
      _: unknown,
      ctx: Context
    ) => {
      // If employee was already loaded (via include), use it
      if (parent.employee) {
        return parent.employee;
      }
      // Otherwise use DataLoader to batch load employee
      return ctx.loaders.employeeLoader.load(parent.employeeId);
    },
  },
};
