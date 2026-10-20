import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { hashToken } from "@/lib/tokens";

async function loadInvite(rawToken: string) {
  const invite = await prisma.businessInvite.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { business: { select: { name: true } } }
  });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() <= Date.now()) return null;
  return invite;
}

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 404 });
  return NextResponse.json({ email: invite.email, role: invite.role, businessName: invite.business.name });
}

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const invite = await loadInvite(params.token);
  if (!invite) return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 400 });
  if (invite.email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Sign in with the invited email" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.businessMember.upsert({
      where: { businessId_userId: { businessId: invite.businessId, userId: user.id } },
      create: { businessId: invite.businessId, userId: user.id, role: invite.role },
      update: { role: invite.role }
    }),
    prisma.businessInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } })
  ]);

  return NextResponse.json({ ok: true, businessId: invite.businessId });
}
