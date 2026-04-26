import type { NextAuthOptions, DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getServerSession } from "next-auth/next";
import type { UserRole, SubscriptionTier } from "@prisma/client";

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
  }
}

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
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        let user = await prisma.user.findUnique({ where: { email } });

        // Self-bootstrap: if the configured admin matches and NO admin exists,
        // create one on the fly. Lets a fresh deploy log in without manual seed.
        if (!user) {
          const adminEmail = (process.env.ADMIN_EMAIL || "admin@reviewqr.in").toLowerCase().trim();
          const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe@123";
          if (email === adminEmail && password === adminPassword) {
            const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
            if (adminCount === 0) {
              const hash = await bcrypt.hash(adminPassword, 12);
              user = await prisma.user.create({
                data: {
                  email: adminEmail,
                  name: "Super Admin",
                  password: hash,
                  role: "ADMIN",
                  subscriptionTier: "AGENCY",
                  subscriptionStatus: "ACTIVE",
                  subscriptionEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                }
              });
              console.log(`[auth] bootstrapped admin ${adminEmail}`);
            }
          }
        }

        if (!user || !user.password) {
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
      } else if (token.id) {
        // Refresh role/tier on each request to keep claims fresh after upgrades
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, subscriptionTier: true, agencyId: true }
        });
        if (u) {
          token.role = u.role;
          token.tier = u.subscriptionTier;
          token.agencyId = u.agencyId;
        }
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

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}

export function isStrongPassword(p: string) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
}
