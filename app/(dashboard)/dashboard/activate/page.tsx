import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { accessRole, allows, readableBusinessWhere } from "@/lib/tenant";
import { ActivateForm } from "./activate-form";

export const dynamic = "force-dynamic";

export default async function ActivatePage({
  searchParams
}: {
  searchParams: { code?: string | string[] };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/dashboard/activate");
  const rows = await prisma.business.findMany({
    where: readableBusinessWhere(user.id),
    include: { members: { where: { userId: user.id }, select: { role: true }, take: 1 } },
    orderBy: { name: "asc" }
  });
  const businesses = rows
    .filter((row) => allows(accessRole(row.ownerId, user.id, row.members[0]?.role), "manage"))
    .map((row) => ({ id: row.id, name: row.name }));
  const raw = Array.isArray(searchParams.code) ? searchParams.code[0] : searchParams.code;
  return <ActivateForm businesses={businesses} initialCode={raw || ""} />;
}
