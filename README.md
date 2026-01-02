# Employee GraphQL Backend

A robust GraphQL API for employee management built with **Apollo Server**, **Prisma ORM**, and **PostgreSQL**. Features include JWT authentication with OTP email verification, role-based access control, and comprehensive employee/attendance management.

---

## ✨ Features

- **GraphQL API** with Apollo Server 5
- **JWT Authentication** with role-based access (Admin/Employee)
- **OTP Email Verification** for secure user registration
- **Prisma ORM** with PostgreSQL database
- **DataLoaders** for optimized N+1 query prevention
- **Input Validation** using Zod
- **Query Depth Limiting** for security
- **Slow Query Detection** monitoring

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| TypeScript | Type safety |
| Apollo Server 5 | GraphQL server |
| Prisma | ORM & database migrations |
| PostgreSQL | Database |
| JSON Web Tokens | Authentication |
| Nodemailer | Email service |
| Zod | Schema validation |
| DataLoader | Query optimization |

---

## 📁 Project Structure

```
src/
├── config/
│   └── email.config.ts      # Email service configuration
├── dataloaders/
│   └── index.ts             # DataLoader implementations
├── graphql/
│   ├── resolvers/           # GraphQL resolvers
│   │   ├── admin.resolver.ts
│   │   ├── auth.resolver.ts
│   │   ├── employee.resolver.ts
│   │   └── index.ts
│   └── typeDefs/            # GraphQL type definitions
│       ├── admin.typeDef.ts
│       ├── auth.typeDef.ts
│       ├── common.typeDef.ts
│       ├── employee.typeDef.ts
│       └── index.ts
├── middleware/
│   └── auth.ts              # JWT authentication middleware
├── prisma/
│   └── client.ts            # Prisma client singleton
├── services/
│   └── email.service.ts     # Email sending service
├── utils/
│   ├── auth.utils.ts        # Auth helper functions
│   └── pagination.utils.ts  # Pagination utilities
├── validation/
│   ├── schemas.ts           # Zod validation schemas
│   └── validate.ts          # Validation helpers
├── context.ts               # GraphQL context creation
└── index.ts                 # Application entry point
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd employee-graphql-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/employee_db"

   # Server
   PORT=4000

   # JWT
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"

   # Email Configuration (for OTP)
   EMAIL_SERVICE="gmail"
   EMAIL_USER="your-email@gmail.com"
   EMAIL_PASS="your-app-password"
   EMAIL_FROM_NAME="Employee Portal"
   ```

4. **Run database migrations**

   ```bash
   npm run prisma:migrate
   ```

5. **Generate Prisma Client**

   ```bash
   npm run prisma:generate
   ```

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Server will be running at `http://localhost:4000`

---

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

---

## 🔐 Authentication Flow

### 1. Register
```graphql
mutation {
  register(input: {
    email: "user@example.com"
    password: "securePassword123"
    role: EMPLOYEE
  }) {
    success
    message
    email
    requiresOTPVerification
  }
}
```

### 2. Verify OTP (sent to email)
```graphql
mutation {
  verifyOTP(input: {
    email: "user@example.com"
    otp: "123456"
  }) {
    success
    message
    token
    user {
      id
      email
      role
    }
  }
}
```

### 3. Login
```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "securePassword123"
  }) {
    success
    token
    user {
      id
      email
      role
    }
  }
}
```

### 4. Use Token in Headers
```
Authorization: Bearer <your-jwt-token>
```

---

## 📊 GraphQL API

### Queries

| Query | Role | Description |
|-------|------|-------------|
| `me` | Any | Get current authenticated user |
| `myProfile` | Employee | Get own employee profile |
| `employee(id)` | Both | Get employee by ID (admin: any, employee: own) |
| `employees(filter, skip, take, sortBy, sortOrder)` | Admin | List employees with filters & pagination |
| `subjects` | Admin | List all subjects |
| `subject(id)` | Admin | Get subject by ID |
| `usersWithoutEmployees` | Admin | Get users without employee records |
| `attendanceByEmployee(employeeId, startDate, endDate)` | Both | Get attendance records |

### Mutations

#### Auth
- `register(input)` - Register new user
- `login(input)` - Login user
- `sendOTP(input)` - Send OTP to email
- `verifyOTP(input)` - Verify OTP code
- `resendOTP(input)` - Resend OTP code

#### Admin Only
- `createEmployee(input)` - Create employee record
- `updateEmployee(id, input)` - Update employee
- `deleteEmployee(id)` - Delete employee
- `createSubject(input)` - Create subject
- `deleteSubject(id)` - Delete subject
- `markAttendance(input)` - Mark attendance

#### Employee
- `updateMyName(input)` - Update own name

---

## 🗄️ Database Schema

### User
- `id` - UUID primary key
- `email` - Unique email
- `passwordHash` - Bcrypt hashed password
- `role` - ADMIN or EMPLOYEE
- `otp`, `otpVerified`, `otpExpires` - OTP verification fields
- `createdAt` - Timestamp

### Employee
- `id` - UUID primary key
- `userId` - Foreign key to User
- `name`, `age`, `class` - Profile fields
- `isActive` - Active status
- `createdAt`, `updatedAt` - Timestamps

### Subject
- `id` - UUID primary key
- `name` - Unique subject name

### Attendance
- `id` - UUID primary key
- `employeeId` - Foreign key to Employee
- `date` - Attendance date
- `status` - true (present) / false (absent)

---

## 🔒 Security Features

- **JWT Authentication** with configurable expiration
- **Password Hashing** using bcrypt
- **OTP Email Verification** for account activation
- **Role-Based Access Control** (Admin/Employee)
- **Query Depth Limiting** (max 10 levels)
- **Input Validation** with Zod schemas
- **CSRF Prevention** (configurable)

---

## 🧪 Example Queries

### Get Employees with Pagination
```graphql
query {
  employees(
    filter: { isActive: true }
    skip: 0
    take: 10
    sortBy: name
    sortOrder: asc
  ) {
    employees {
      id
      name
      age
      class
      subjects {
        name
      }
    }
    totalCount
    hasNextPage
    hasPreviousPage
  }
}
```

### Create Employee (Admin)
```graphql
mutation {
  createEmployee(input: {
    userId: "user-uuid"
    name: "John Doe"
    age: 30
    class: "Engineering"
    subjectIds: ["subject-uuid-1", "subject-uuid-2"]
  }) {
    id
    name
    subjects {
      name
    }
  }
}
```

### Mark Attendance (Admin)
```graphql
mutation {
  markAttendance(input: {
    employeeId: "employee-uuid"
    date: "2025-01-02"
    status: true
  }) {
    id
    date
    status
  }
}
```

---


