export const adminTypeDefs = `#graphql
  input CreateEmployeeInput {
    name: String!
    age: Int
    class: String
    subjectIds: [String!]
  }

  input UpdateEmployeeInput {
    name: String
    age: Int
    class: String
    isActive: Boolean
    subjectIds: [String!]
  }

  input CreateSubjectInput {
    name: String!
  }

  input MarkAttendanceInput {
    employeeId: String!
    date: String!
    status: Boolean!
  }

  input EmployeeFilterInput {
    name: String
    age: Int
    class: String
    isActive: Boolean
  }

  enum SortField {
    name
    age
    class
    createdAt
    updatedAt
  }

  enum SortOrder {
    asc
    desc
  }

  type EmployeePaginatedResponse {
    employees: [Employee!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  extend type Query {
    # Admin: Get all employees with filters, pagination, and sorting
    employees(
      filter: EmployeeFilterInput
      skip: Int
      take: Int
      sortBy: SortField
      sortOrder: SortOrder
    ): EmployeePaginatedResponse!
    
    # Admin: Get all subjects
    subjects: [Subject!]!
    subject(id: ID!): Subject
  }

  extend type Mutation {
    # Employee Management (Admin only)
    createEmployee(input: CreateEmployeeInput!): Employee!
    updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee!
    deleteEmployee(id: ID!): Boolean!

    # Subject Management (Admin only)
    createSubject(input: CreateSubjectInput!): Subject!
    deleteSubject(id: ID!): Boolean!

    # Attendance Management (Admin only)
    markAttendance(input: MarkAttendanceInput!): Attendance!
  }
`;
