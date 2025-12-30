import { z } from 'zod';

// Auth validation schemas
export const registerInputSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional().default('EMPLOYEE'),
});

export const loginInputSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

// Employee validation schemas
export const createEmployeeInputSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(100, 'Age must be less than 100')
    .optional()
    .nullable(),
  class: z
    .string()
    .min(1, 'Class must be at least 1 character')
    .max(50, 'Class must be less than 50 characters')
    .optional()
    .nullable(),
  subjectIds: z.array(z.string().uuid('Invalid subject ID format')).optional(),
});

export const updateEmployeeInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(18, 'Age must be at least 18')
    .max(100, 'Age must be less than 100')
    .optional()
    .nullable(),
  class: z
    .string()
    .min(1, 'Class must be at least 1 character')
    .max(50, 'Class must be less than 50 characters')
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
  subjectIds: z.array(z.string().uuid('Invalid subject ID format')).optional(),
});

// Subject validation schemas
export const createSubjectInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Subject name must be at least 2 characters')
    .max(100, 'Subject name must be less than 100 characters'),
});

// Attendance validation schemas
export const markAttendanceInputSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  date: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .refine((val) => new Date(val) <= new Date(), 'Cannot mark attendance for future dates'),
  status: z.boolean(),
});

// Filter and pagination validation
export const employeeFilterSchema = z.object({
  name: z.string().max(100).optional(),
  age: z.number().int().min(0).max(150).optional(),
  class: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export const paginationSchema = z.object({
  skip: z.number().int().min(0).default(0),
  take: z.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(['name', 'age', 'class', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const attendanceQuerySchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid start date format')
    .optional()
    .nullable(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid end date format')
    .optional()
    .nullable(),
});

// Schema for employee to update their own name
export const updateMyNameSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
});

// ID validation
export const idSchema = z.string().uuid('Invalid ID format');

// Type exports for TypeScript
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceInputSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type UpdateMyNameInput = z.infer<typeof updateMyNameSchema>;
