export const commonTypeDefs = `#graphql
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
`;

