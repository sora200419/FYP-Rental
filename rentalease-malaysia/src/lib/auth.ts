import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';
import { loginRateLimit } from './ratelimit';

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Make sure email and password are provided
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        // Rate limit: 5 attempts per email per 15 minutes (IMP-14)
        try {
          const { success } = await loginRateLimit.limit(credentials.email.toLowerCase());
          if (!success) {
            throw new Error('Too many login attempts. Please try again in 15 minutes.');
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Too many')) throw err;
          // If Redis is unavailable, log and continue — don't block auth entirely
          console.error('[auth] Rate limit check failed (non-blocking):', err);
        }

        // Find the user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            language: true,
            isSuspended: true,
            deletedAt: true,
          },
        });

        if (!user) {
          throw new Error('No account found with this email');
        }

        if (user.deletedAt) {
          throw new Error('This account has been removed.');
        }

        if (user.isSuspended) {
          throw new Error('Your account has been suspended. Please contact support.');
        }

        // Compare the submitted password with the hashed password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValidPassword) {
          throw new Error('Incorrect password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          language: user.language ?? 'en',
          isSuspended: user.isSuspended,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        token.role = (user as { id: string; role: string; language: string }).role;
        token.id = user.id;
        token.language = (user as { language: string }).language ?? 'en';
        token.isSuspended = (user as { isSuspended: boolean }).isSuspended ?? false;
      } else if (token.id) {
        // Re-fetch suspension status on every subsequent request so that admin
        // suspension takes effect immediately without requiring sign-out/sign-in.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isSuspended: true },
        });
        if (dbUser) token.isSuspended = dbUser.isSuspended;
      }
      // Allow updating name/language via session update() call
      if (trigger === 'update') {
        if (updatedSession?.language) token.language = updatedSession.language;
        if (updatedSession?.name) token.name = updatedSession.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        session.user.language = (token.language as string) ?? 'en';
        session.user.isSuspended = token.isSuspended as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
