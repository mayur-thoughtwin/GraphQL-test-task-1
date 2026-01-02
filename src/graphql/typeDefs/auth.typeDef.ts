export const authTypeDefs = `#graphql
  type AuthPayload {
    token: String!
    user: User!
  }

  type RegisterResponse {
    success: Boolean!
    message: String!
    email: String!
    requiresOTPVerification: Boolean!
    otp: String
  }

  type LoginResponse {
    token: String
    user: User
    success: Boolean!
    message: String!
    requiresOTPVerification: Boolean!
    email: String
    otp: String
  }

  type OTPResponse {
    success: Boolean!
    message: String!
    otp: String
  }

  type VerifyOTPResponse {
    success: Boolean!
    message: String!
    token: String
    user: User
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

  input SendOTPInput {
    email: String!
  }

  input VerifyOTPInput {
    email: String!
    otp: String!
  }

  type Query {
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): RegisterResponse!
    login(input: LoginInput!): LoginResponse!
    sendOTP(input: SendOTPInput!): OTPResponse!
    verifyOTP(input: VerifyOTPInput!): VerifyOTPResponse!
    resendOTP(input: SendOTPInput!): OTPResponse!
  }
`;
