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

      // Check if user is OTP verified - if not, send new OTP and throw error
      if (dbUser && !dbUser.otpVerified) {
        // Generate and send new OTP
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
    // Register - does NOT return token, requires OTP verification first
    register: async (_: unknown, { input }: { input: unknown }, { prisma }: Context) => {
      const validatedInput = validateInput(registerInputSchema, input);
      const { password, role } = validatedInput;
      
      // Convert email to lowercase for case-insensitive handling
      const email = validatedInput.email.toLowerCase().trim();

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        // If user exists but not verified, resend OTP
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
      
      // Generate OTP for email verification
      const otp = generateOTP();
      const otpExpires = getOTPExpiry();

      await prisma.user.create({
        data: { 
          email, // Already lowercase
          passwordHash, 
          role,
          otp,
          otpExpires,
          otpVerified: false,
        },
      });

      // Send OTP email
      try {
        await sendOTPEmail(email, otp);
      } catch (error) {
        console.error('Failed to send OTP email during registration:', error);
        throw new GraphQLError('Failed to send verification email. Please try again.', {
          extensions: { code: 'EMAIL_SEND_FAILED' },
        });
      }

      // Return success but NO token - user must verify OTP first
      return {
        success: true,
        message: 'Registration successful! Please verify your email with the OTP sent to your inbox.',
        email,
        requiresOTPVerification: true,
      };
    },

    // Login - checks OTP verification status
    login: async (_: unknown, { input }: { input: unknown }, { prisma }: Context) => {
      const validatedInput = validateInput(loginInputSchema, input);
      const { password } = validatedInput;
      
      // Convert email to lowercase for case-insensitive handling
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

      // Check if user is OTP verified
      if (!user.otpVerified) {
        // Generate and send new OTP
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

        // Return response indicating OTP is required
        return {
          token: null,
          user: null,
          success: false,
          message: 'Email not verified. A new OTP has been sent to your email.',
          requiresOTPVerification: true,
          email,
        };
      }

      // User is verified, generate token
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

    // Send OTP to user's email
    sendOTP: async (_: unknown, { input }: { input: SendOTPInput }, { prisma }: Context) => {
      // Convert email to lowercase for case-insensitive handling
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

      // Generate new OTP
      const otp = generateOTP();
      const otpExpires = getOTPExpiry();

      // Update user with new OTP
      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      // Send OTP email
      await sendOTPEmail(email, otp);

      return {
        success: true,
        message: 'OTP sent successfully to your email',
      };
    },

    // Verify OTP - returns token on successful verification
    verifyOTP: async (_: unknown, { input }: { input: VerifyOTPInput }, { prisma }: Context) => {
      // Convert email to lowercase for case-insensitive handling
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
        // Already verified, generate token
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

      // Check if OTP is expired
      if (!isOTPValid(user.otpExpires)) {
        throw new GraphQLError('OTP has expired. Please request a new OTP.', {
          extensions: { code: 'OTP_EXPIRED' },
        });
      }

      // Check if OTP matches
      if (user.otp !== otp) {
        throw new GraphQLError('Invalid OTP. Please try again.', {
          extensions: { code: 'INVALID_OTP' },
        });
      }

      // Mark user as verified
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          otpVerified: true,
          otp: null,
          otpExpires: null,
        },
        include: { employee: true },
      });

      // Generate JWT token after successful verification
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

    // Resend OTP
    resendOTP: async (_: unknown, { input }: { input: SendOTPInput }, { prisma }: Context) => {
      // Convert email to lowercase for case-insensitive handling
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

      // Generate new OTP
      const otp = generateOTP();
      const otpExpires = getOTPExpiry();

      // Update user with new OTP
      await prisma.user.update({
        where: { email },
        data: { otp, otpExpires },
      });

      // Send OTP email
      await sendOTPEmail(email, otp);

      return {
        success: true,
        message: 'New OTP sent successfully to your email',
      };
    },
  },
};
