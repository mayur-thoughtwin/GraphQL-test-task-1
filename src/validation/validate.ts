import { GraphQLError } from 'graphql';
import { z, ZodError, ZodIssue } from 'zod';

/**
 * Validates input against a Zod schema and returns the validated data
 * Throws a GraphQL error with detailed validation messages if validation fails
 */
export function validateInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      const issues: ZodIssue[] = error.issues;
      const messages = issues.map((err: ZodIssue) => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });

      throw new GraphQLError(`Validation error: ${messages.join(', ')}`, {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors: issues.map((err: ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
      });
    }
    throw error;
  }
}

/**
 * Validates an ID string (UUID format)
 */
export function validateId(id: string, fieldName = 'id'): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new GraphQLError(`Invalid ${fieldName} format`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  return id;
}
