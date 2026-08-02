import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatDate, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: { q?: string; tier?: string; role?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const tier = searchParams.tier;
  const role = searchParams.role;

  const where: any = { AND: [] };
  if (q) {
    where.AND.push({
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } }
      ]
    });
  }
  if (tier) where.AND.push({ subscriptionTier: tier });
  if (role) where.AND.push({ role });
  if (where.AND.length === 0) delete where.AND;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { businesses: true, payments: true } }
    }
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Users</h1>
          <p className="text-sm text-muted-foreground">
            {users.length} shown · search by email / name / phone
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search email, name, phone…"
                className="pl-9"
              />
            </div>
            <select
              name="tier"
              defaultValue={tier || ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Any plan</option>
              <option value="FREE">Free</option>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="AGENCY">Agency</option>
            </select>
            <select
              name="role"
              defaultValue={role || ""}
              className="h-10 rounded-lg border bg-white px-3 text-sm"
            >
              <option value="">Any role</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
              <option value="AGENCY">Agency</option>
              <option value="STAFF">Staff</option>
            </select>
            <button className="h-10 px-4 rounded-lg bg-foreground text-white text-sm font-medium">
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4">User</th>
                  <th className="text-left py-2.5 px-4">Role</th>
                  <th className="text-left py-2.5 px-4">Plan</th>
                  <th className="text-left py-2.5 px-4">Status</th>
                  <th className="text-left py-2.5 px-4">Businesses</th>
                  <th className="text-left py-2.5 px-4">Trial / Renews</th>
                  <th className="text-left py-2.5 px-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b hover:bg-secondary/40 last:border-0">
                    <td className="py-2.5 px-4">
                      <Link href={`/admin/users/${u.id}`} className="block">
                        <div className="font-medium">{u.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge
                        variant={
                          u.role === "ADMIN"
                            ? "destructive"
                            : u.role === "AGENCY"
                            ? "default"
                            : "outline"
                        }
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 font-medium">{u.subscriptionTier}</td>
                    <td className="py-2.5 px-4">
                      <Badge
                        variant={
                          u.subscriptionStatus === "ACTIVE"
                            ? "success"
                            : u.subscriptionStatus === "TRIALING"
                            ? "warning"
                            : "outline"
                        }
                      >
                        {u.subscriptionStatus}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4">{u._count.businesses}</td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">
                      {u.trialEndsAt
                        ? `Trial: ${formatDate(u.trialEndsAt)}`
                        : u.subscriptionEndsAt
                        ? `Renews: ${formatDate(u.subscriptionEndsAt)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-muted-foreground">
                      {timeAgo(u.createdAt)}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No users matched.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
