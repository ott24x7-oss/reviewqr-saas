import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { loadOwnedBusiness } from "@/lib/tenant";
import { emailSchema } from "@/lib/validations";
import { hashToken, randomToken } from "@/lib/tokens";
import { absoluteUrl } from "@/lib/utils";
import { escapeHtml, sendEmail } from "@/lib/email";
import { denyFeatureResponse } from "@/lib/plans/feature-gate";
import { rateLimitDb } from "@/lib/rate-limit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await loadOwnedBusiness(user.id, params.id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const denied = await denyFeatureResponse(business.ownerId, "staff");
  if (denied) return denied;

  const [members, invites] = await Promise.all([
    prisma.businessMember.findMany({
      where: { businessId: business.id },
      include: { user: { select: { email: true, name: true } } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.businessInvite.findMany({
      where: { businessId: business.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      role: member.role,
      email: member.user.email,
      name: member.user.name
    })),
    invites: invites.map((invite) => ({ id: invite.id, email: invite.email, role: invite.role }))
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await loadOwnedBusiness(user.id, params.id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const denied = await denyFeatureResponse(business.ownerId, "staff");
  if (denied) return denied;

  const rl = await rateLimitDb({ key: `invite:${user.id}`, limit: 20, windowSeconds: 3600 });
  if (!rl.ok) return NextResponse.json({ error: "Too many invites" }, { status: 429 });

  const parsed = z
    .object({ email: emailSchema, role: z.enum(["MANAGER", "STAFF"]) })
    .safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid invite" }, { status: 400 });
  }
  const email = parsed.data.email;
  if (email === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You already own this business" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const member = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: existingUser.id } }
    });
    if (member) return NextResponse.json({ error: "That person is already on the team" }, { status: 400 });
  }

  const token = randomToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await prisma.businessInvite.deleteMany({
    where: { businessId: business.id, email, acceptedAt: null }
  });
  await prisma.businessInvite.create({
    data: {
      businessId: business.id,
      email,
      role: parsed.data.role,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  const url = absoluteUrl(`/invite/${token}`);
  await sendEmail({
    to: email,
    subject: `Join ${business.name} on QR24x7`,
    html: `<p>${escapeHtml(user.name || user.email)} invited you to ${escapeHtml(business.name)} as ${parsed.data.role.toLowerCase()}.</p><p><a href="${url}">Accept invite</a></p><p>This link works once and expires in 7 days.</p>`
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const business = await loadOwnedBusiness(user.id, params.id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberId = req.nextUrl.searchParams.get("memberId") || "";
  const removed = await prisma.businessMember.deleteMany({
    where: { id: memberId, businessId: business.id }
  });
  if (!removed.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
