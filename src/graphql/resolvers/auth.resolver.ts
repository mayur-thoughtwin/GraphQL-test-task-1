import { GraphQLError } from 'graphql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Context } from '../../context';
import { validateInput } from '../../validation/validate';
import { registerInputSchema, loginInputSchema } from '../../validation/schemas';
import { generateOTP, getOTPExpiry, isOTPValid, sendOTPEmail } from '../../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
        const otp = generateOTP();
        const otpExpires = getOTPExpiry();
        
        await prisma.user.update({
          where: { id: user.id },
          data: { otp, otpExpires },
        });

        try {
          await sendOTPEmail(dbUser.email, otp);
        } catch (error) {
          console.error('Failed to send OTP email:', error);
        }

        throw new GraphQLError('Email not verified. A new OTP has been sent to your email.', {
          extensions: { 
            code: 'OTP_REQUIRED',
            email: dbUser.email,
            requiresOTPVerification: true,
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
          const otp = generateOTP();
          const otpExpires = getOTPExpiry();
          
          await prisma.user.update({
            where: { email },
            data: { otp, otpExpires },
          });

          try {
            await sendOTPEmail(email, otp);
          } catch (error) {
            console.error('Failed to send OTP email:', error);
          }

          return {
            success: true,
            message: 'Account exists but is not verified. A new OTP has been sent to your email.',
            email,
            requiresOTPVerification: true,
          };
        }

        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      
      const otp = generateOTP();
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

      try {
        await sendOTPEmail(email, otp);
      } catch (error) {
        console.error('Failed to send OTP email during registration:', error);
        throw new GraphQLError('Failed to send verification email. Please try again.', {
          extensions: { code: 'EMAIL_SEND_FAILED' },
        });
      }

      return {
        success: true,
        message: 'Registration successful! Please verify your email with the OTP sent to your inbox.',
        email,
        requiresOTPVerification: true,
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
        const otp = generateOTP();
        const otpExpires = getOTPExpiry();
        
        await prisma.user.update({
          where: { email },
          data: { otp, otpExpires },
        });

        try {
          await sendOTPEmail(email, otp);
        } catch (error) {
          console.error('Failed to send OTP email:', error);
        }

        return {
          token: null,
          user: null,
          success: false,
          message: 'Email not verified. A new OTP has been sent to your email.',
          requiresOTPVerification: true,
          email,
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

      const otp = generateOTP();
      const otpExpires = getOTPExpiry();

      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      await sendOTPEmail(email, otp);

      return {
        success: true,
        message: 'OTP sent successfully to your email',
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

      const otp = generateOTP();
      const otpExpires = getOTPExpiry();

      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      await sendOTPEmail(email, otp);

      return {
        success: true,
        message: 'New OTP sent successfully to your email',
      };
    },
  },
};
