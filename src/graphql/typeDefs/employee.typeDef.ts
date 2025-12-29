export const employeeTypeDefs = `#graphql
  extend type Query {
    # Employee: Get own profile (shortcut)
    myProfile: Employee
    
    # Employee: Get employee by ID (admin can view any, employee can only view own)
    employee(id: ID!): Employee
    
    # Employee: Get attendance records with optional date filters
    attendanceByEmployee(employeeId: String!, startDate: String, endDate: String): [Attendance!]!
  }
`;
