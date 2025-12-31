import { authResolvers } from './auth.resolver';
import { adminResolvers } from './admin.resolver';
import { employeeResolvers } from './employee.resolver';

export const resolvers = {
  Query: {
    ...authResolvers.Query,
    ...adminResolvers.Query,
    ...employeeResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...adminResolvers.Mutation,
    ...employeeResolvers.Mutation,
  },
  Employee: employeeResolvers.Employee,
  Subject: employeeResolvers.Subject,
  User: employeeResolvers.User,
  Attendance: employeeResolvers.Attendance,
};
