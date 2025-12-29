import { authResolvers } from './auth.resolver';
import { adminResolvers } from './admin.resolver';
import { employeeResolvers } from './employee.resolver';

// Merge all resolvers
export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...adminResolvers.Query,
    ...employeeResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...adminResolvers.Mutation,
  },
  // Field resolvers for type resolution with DataLoaders
  Employee: employeeResolvers.Employee,
  Subject: employeeResolvers.Subject,
  User: employeeResolvers.User,
  Attendance: employeeResolvers.Attendance,
};
