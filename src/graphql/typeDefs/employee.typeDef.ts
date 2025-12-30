export const employeeTypeDefs = `#graphql
  input UpdateMyNameInput {
    name: String!
  }

  extend type Query {
    # Employee: Get own profile (shortcut)
    myProfile: Employee
    
    # Employee: Get employee by ID (admin can view any, employee can only view own)
    employee(id: ID!): Employee
    
    # Employee: Get attendance records with optional date filters
    attendanceByEmployee(employeeId: String!, startDate: String, endDate: String): [Attendance!]!
  }

  extend type Mutation {
    # Employee: Update own name (accessible by both employee and admin)
    updateMyName(input: UpdateMyNameInput!): Employee!
  }
`;
