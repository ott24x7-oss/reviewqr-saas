import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { absoluteUrl, getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const rl = await rateLimit({ key: `register:${ip}`, limit: 5, windowSeconds: 600 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const hash = await hashPassword(data.password);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      phone: data.phone || null,
      password: hash,
      role: "USER",
      subscriptionTier: "GROWTH",
      subscriptionStatus: "TRIALING",
      trialEndsAt
    }
  });

  if (data.businessName) {
    let slug = slugify(data.businessName);
    let count = 0;
    while (await prisma.business.findUnique({ where: { slug } })) {
      count += 1;
      slug = slugify(data.businessName) + "-" + (count + 1);
      if (count > 5) {
        slug = slugify(data.businessName, true);
        break;
      }
    }
    await prisma.business.create({
      data: {
        ownerId: user.id,
        name: data.businessName,
        slug,
        ratingThreshold: 4,
        primaryColor: "#1a73e8",
        whatsappNumber: data.phone || null,
        email
      }
    });
  }

  // Welcome email — best-effort
  sendEmail({
    to: email,
    subject: "Welcome to ReviewQR 🎉",
    html: welcomeEmail({
      name: data.name,
      email,
      loginUrl: absoluteUrl("/dashboard")
    })
  }).catch(() => {});

  return NextResponse.json({ ok: true, userId: user.id });
}
