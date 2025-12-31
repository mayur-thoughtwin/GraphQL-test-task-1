import { validateInput } from '../validation/validate';
import { paginationSchema, PaginationInput } from '../validation/schemas';

export interface PaginationArgs {
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationOptions {
  skip: number;
  take: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const getPaginationOptions = (args: PaginationArgs): PaginationOptions => {
  const validated = validateInput(paginationSchema, {
    skip: args.skip ?? 0,
    take: args.take ?? 10,
    sortBy: args.sortBy ?? 'createdAt',
    sortOrder: args.sortOrder ?? 'desc',
  }) as PaginationInput;

  return {
    skip: validated.skip,
    take: validated.take,
    sortBy: validated.sortBy,
    sortOrder: validated.sortOrder,
  };
};

export const buildPaginatedResponse = <T>(
  items: T[],
  totalCount: number,
  pagination: PaginationOptions
): PaginatedResult<T> => {
  return {
    items,
    totalCount,
    hasNextPage: pagination.skip + pagination.take < totalCount,
    hasPreviousPage: pagination.skip > 0,
  };
};
