import type { NextAuthOptions, DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getServerSession } from "next-auth/next";
import type { UserRole, SubscriptionTier } from "@prisma/client";
import { cookies } from "next/headers";
import { consumeOtpSession } from "./otp";
import { rateLimitDb } from "./rate-limit";
import { canImpersonateTarget, IMPERSONATION_COOKIE, impersonationAllowed, openImpersonation } from "./impersonation";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      tier: SubscriptionTier;
      agencyId?: string | null;
    };
  }
  interface User {
    role: UserRole;
    tier: SubscriptionTier;
    agencyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tier: SubscriptionTier;
    agencyId?: string | null;
    /** Epoch ms of the last database refresh of role, tier, and agencyId. */
    claimsRefreshedAt?: number;
  }
}

const CLAIMS_TTL_MS = 5 * 60 * 1000;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    newUser: "/dashboard"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otpToken: { label: "OTP token", type: "text" }
      },
      async authorize(credentials) {
        const otpToken = credentials?.otpToken ? String(credentials.otpToken) : "";
        if (otpToken) {
          const user = await consumeOtpSession(otpToken);
          if (!user) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            tier: user.subscriptionTier,
            agencyId: user.agencyId
          } as any;
        }

        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        const rl = await rateLimitDb({ key: `login:${email}`, limit: 10, windowSeconds: 600 });
        if (!rl.ok) return null;

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password || user.deletedAt) {
          console.warn(`[auth] login failed for ${email}: user not found or no password set`);
          return null;
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          console.warn(`[auth] login failed for ${email}: bad password`);
          return null;
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tier: user.subscriptionTier,
          agencyId: user.agencyId
        } as any;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.tier = (user as any).tier;
        token.agencyId = (user as any).agencyId;
        token.claimsRefreshedAt = Date.now();
        return token;
      }

      const refreshedAt = typeof token.claimsRefreshedAt === "number" ? token.claimsRefreshedAt : 0;
      if (token.id && Date.now() - refreshedAt > CLAIMS_TTL_MS) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, subscriptionTier: true, agencyId: true }
        });
        if (u) {
          token.role = u.role;
          token.tier = u.subscriptionTier;
          token.agencyId = u.agencyId;
        }
        token.claimsRefreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.tier = token.tier;
        session.user.agencyId = token.agencyId;
      }
      return session;
    }
  }
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** The real session user. Ignores the impersonation cookie. */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.deletedAt) return null;
  return user;
}

/**
 * Dashboard viewer. When a valid impersonation cookie matches this admin,
 * dashboard data is loaded for the target. The session itself stays the admin.
 */
export async function getDashboardViewer() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  const token = cookies().get(IMPERSONATION_COOKIE)?.value;
  const payload = token ? openImpersonation(token) : null;
  if (!payload || !impersonationAllowed(sessionUser, payload)) {
    return { user: sessionUser, impersonation: null as { exp: number } | null };
  }
  const target = await prisma.user.findUnique({ where: { id: payload.targetUserId } });
  if (!target || target.deletedAt || !canImpersonateTarget(target.role)) {
    return { user: sessionUser, impersonation: null as { exp: number } | null };
  }
  return { user: target, impersonation: { exp: payload.exp } };
}

export async function getCurrentUser() {
  const view = await getDashboardViewer();
  return view?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function isStrongPassword(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
}
