import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getImageAiConfig } from "@/lib/settings";
import { dayKey } from "@/lib/entitlements";
import type { ItemImageJobStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;
  const status = req.nextUrl.searchParams.get("status");
  const businessId = req.nextUrl.searchParams.get("businessId") || undefined;
  const where = {
    ...(status && ["QUEUED", "RUNNING", "READY", "APPROVED", "REJECTED", "FAILED"].includes(status) ? { status: status as ItemImageJobStatus } : {}),
    ...(businessId ? { businessId } : {})
  };
  const [jobs, cfg, spend] = await Promise.all([
    prisma.itemImageJob.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: {
      business: { select: { id: true, name: true } }, item: { select: { id: true, name: true, photo: true, photos: true } }
    } }),
    getImageAiConfig(),
    prisma.platformAiSpend.findUnique({ where: { day: dayKey() } })
  ]);
  return NextResponse.json({ jobs, spendPaise: spend?.paise || 0, dailyCapPaise: cfg.dailyCapPaise });
}
