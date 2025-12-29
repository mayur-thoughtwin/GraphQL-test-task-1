export const typeDefs = `#graphql
  enum Role {
    ADMIN
    EMPLOYEE
  }

  type User {
    id: ID!
    email: String!
    role: Role!
    employee: Employee
    createdAt: String!
  }

  type Employee {
    id: ID!
    userId: String!
    name: String!
    age: Int
    class: String
    user: User!
    subjects: [Subject!]!
    attendance: [Attendance!]!
    isActive: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type Subject {
    id: ID!
    name: String!
    employees: [Employee!]!
  }

  type Attendance {
    id: ID!
    employeeId: String!
    date: String!
    status: Boolean!
    employee: Employee!
    createdAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input RegisterInput {
    email: String!
    password: String!
    role: Role
  }

  input LoginInput {
    email: String!
    password: String!
  }

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

  type Query {
    # User queries
    me: User

    # Employee queries
    employees(filter: EmployeeFilterInput, skip: Int, take: Int): [Employee!]!
    employee(id: ID!): Employee

    # Subject queries
    subjects: [Subject!]!
    subject(id: ID!): Subject

    # Attendance queries
    attendanceByEmployee(employeeId: String!, startDate: String, endDate: String): [Attendance!]!
  }

  type Mutation {
    # Auth mutations
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Employee mutations (Admin only)
    createEmployee(input: CreateEmployeeInput!): Employee!
    updateEmployee(id: ID!, input: UpdateEmployeeInput!): Employee!
    deleteEmployee(id: ID!): Boolean!

    # Subject mutations (Admin only)
    createSubject(input: CreateSubjectInput!): Subject!
    deleteSubject(id: ID!): Boolean!

    # Attendance mutations (Admin only)
    markAttendance(input: MarkAttendanceInput!): Attendance!
  }
`;

