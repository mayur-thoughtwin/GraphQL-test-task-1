import { GraphQLError } from 'graphql';
import { Context, UserPayload } from '../context';
import { generateOTP, getOTPExpiry, sendOTPEmail } from '../services/email.service';

/**
 * Checks if user is authenticated and OTP verified
 * If not verified, sends new OTP and throws error
 */
export const requireAuthAndVerified = async (ctx: Context): Promise<UserPayload> => {
  const { user, prisma } = ctx;

  if (!user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  // Check if user is OTP verified
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    throw new GraphQLError('User not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!dbUser.otpVerified) {
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

  return user;
};

/**
 * Simple authentication check without OTP verification
 * Use this only for OTP-related operations
 */
export const requireAuth = (ctx: Context): UserPayload => {
  const { user } = ctx;

  if (!user) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  return user;
};
