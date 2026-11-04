import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addStarterGuides } from "@/lib/blog/starter-guides";
import { logAudit, requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  const created = await addStarterGuides(prisma);
  await logAudit({
    userId: guard.user.id,
    action: "settings.blog.update",
    entity: "BlogPost",
    entityId: "starter-guides",
    metadata: { operation: "add_starter_guides", created },
    ip: getClientIp(req.headers)
  });

  if (created > 0) {
    revalidatePath("/blog");
    revalidatePath("/hi/blog");
    revalidatePath("/sitemap.xml");
  }

  return NextResponse.json({ created });
}
