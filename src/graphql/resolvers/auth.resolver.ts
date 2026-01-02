import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../../context';
import { validateInput } from '../../validation/validate';
import { registerInputSchema, loginInputSchema } from '../../validation/schemas';
import { generateOTP, getOTPExpiry, isOTPValid, sendOTPEmail } from '../../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const HARDCODED_OTP = '123456';

interface SendOTPInput {
  email: string;
}

interface VerifyOTPInput {
  email: string;
  otp: string;
}

export const authResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { prisma, user }: Context) => {
      if (!user) {
        throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
      }
      
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { employee: true },
      });

      if (dbUser && !dbUser.otpVerified) {
        const otp = HARDCODED_OTP;
        const otpExpires = getOTPExpiry();
        
        await prisma.user.update({
          where: { id: user.id },
          data: { otp, otpExpires },
        });

        throw new GraphQLError('Email not verified. Use OTP: ' + otp + ' to verify.', {
          extensions: { 
            code: 'OTP_REQUIRED',
            email: dbUser.email,
            requiresOTPVerification: true,
            otp,
          },
        });
      }

      return dbUser;
    },
  },

  Mutation: {
    register: async (_: unknown, { input }: { input: unknown }, { prisma }: Context) => {
      const validatedInput = validateInput(registerInputSchema, input);
      const { password, role } = validatedInput;
      
      const email = validatedInput.email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        if (!existingUser.otpVerified) {
          const otp = HARDCODED_OTP;
          const otpExpires = getOTPExpiry();
          
          await prisma.user.update({
            where: { email },
            data: { otp, otpExpires },
          });

          return {
            success: true,
            message: 'Account exists but is not verified. Use the OTP shown below to verify.',
            email,
            requiresOTPVerification: true,
            otp,
          };
        }

        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      
      const otp = HARDCODED_OTP;
      const otpExpires = getOTPExpiry();

      await prisma.user.create({
        data: { 
          email,
          passwordHash, 
          role,
          otp,
          otpExpires,
          otpVerified: false,
        },
      });

      return {
        success: true,
        message: 'Registration successful! Use the OTP shown below to verify your account.',
        email,
        requiresOTPVerification: true,
        otp,
      };
    },

    login: async (_: unknown, { input }: { input: unknown }, { prisma }: Context) => {
      const validatedInput = validateInput(loginInputSchema, input);
      const { password } = validatedInput;
      
      const email = validatedInput.email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email },
        include: { employee: true },
      });

      if (!user) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new GraphQLError('Invalid email or password', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!user.otpVerified) {
        const otp = HARDCODED_OTP;
        const otpExpires = getOTPExpiry();
        
        await prisma.user.update({
          where: { email },
          data: { otp, otpExpires },
        });

        return {
          token: null,
          user: null,
          success: false,
          message: 'Email not verified. Use the OTP shown below to verify.',
          requiresOTPVerification: true,
          email,
          otp,
        };
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        token,
        user,
        success: true,
        message: 'Login successful!',
        requiresOTPVerification: false,
        email: null,
      };
    },

    sendOTP: async (_: unknown, { input }: { input: SendOTPInput }, { prisma }: Context) => {
      const email = input.email.toLowerCase().trim();

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new GraphQLError('User not found with this email', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.otpVerified) {
        return {
          success: true,
          message: 'Email is already verified',
        };
      }

      const otp = HARDCODED_OTP;
      const otpExpires = getOTPExpiry();

      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      return {
        success: true,
        message: 'OTP generated successfully. Use the OTP shown below.',
        otp,
      };
    },

    verifyOTP: async (_: unknown, { input }: { input: VerifyOTPInput }, { prisma }: Context) => {
      const email = input.email.toLowerCase().trim();
      const { otp } = input;

      const user = await prisma.user.findUnique({ 
        where: { email },
        include: { employee: true },
      });

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.otpVerified) {
        const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
          expiresIn: '7d',
        });

        return {
          success: true,
          message: 'Email is already verified',
          token,
          user,
        };
      }

      if (!user.otp || !user.otpExpires) {
        throw new GraphQLError('No OTP found. Please request a new OTP.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!isOTPValid(user.otpExpires)) {
        throw new GraphQLError('OTP has expired. Please request a new OTP.', {
          extensions: { code: 'OTP_EXPIRED' },
        });
      }

      if (user.otp !== otp) {
        throw new GraphQLError('Invalid OTP. Please try again.', {
          extensions: { code: 'INVALID_OTP' },
        });
      }

      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          otpVerified: true,
          otp: null,
          otpExpires: null,
        },
        include: { employee: true },
      });

      const token = jwt.sign({ userId: updatedUser.id, role: updatedUser.role }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        success: true,
        message: 'Email verified successfully! You are now logged in.',
        token,
        user: updatedUser,
      };
    },

    resendOTP: async (_: unknown, { input }: { input: SendOTPInput }, { prisma }: Context) => {
      const email = input.email.toLowerCase().trim();

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new GraphQLError('User not found with this email', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (user.otpVerified) {
        return {
          success: true,
          message: 'Email is already verified',
        };
      }

      const otp = HARDCODED_OTP;
      const otpExpires = getOTPExpiry();

      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      return {
        success: true,
        message: 'New OTP generated successfully. Use the OTP shown below.',
        otp,
      };
    },
  },
};
