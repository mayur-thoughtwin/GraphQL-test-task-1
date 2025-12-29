export const employeeTypeDefs = `#graphql
  extend type Query {
    # Employee: Get own profile
    employee(id: ID!): Employee
    
    # Employee: Get own attendance
    attendanceByEmployee(employeeId: String!, startDate: String, endDate: String): [Attendance!]!
  }
`;

