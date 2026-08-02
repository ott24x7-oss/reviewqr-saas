import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timeAgo, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const userIds = Array.from(new Set(logs.map((l) => l.userId).filter(Boolean) as string[]));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true }
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Audit log</h1>
        <p className="text-sm text-muted-foreground">{logs.length} most-recent events</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left py-2.5 px-4">When</th>
                  <th className="text-left py-2.5 px-4">Actor</th>
                  <th className="text-left py-2.5 px-4">Action</th>
                  <th className="text-left py-2.5 px-4">Target</th>
                  <th className="text-left py-2.5 px-4">Metadata</th>
                  <th className="text-left py-2.5 px-4">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => {
                  const u = l.userId ? userMap.get(l.userId) : null;
                  return (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 px-4 text-xs">
                        <div>{timeAgo(l.createdAt)}</div>
                        <div className="text-muted-foreground">{formatDate(l.createdAt)}</div>
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {u ? u.email : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline">{l.action}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">
                        {l.entity ? `${l.entity}:${l.entityId?.slice(0, 8) || "—"}` : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-muted-foreground max-w-xs truncate">
                        {l.metadata ? JSON.stringify(l.metadata) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">
                        {l.ip || "—"}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No events yet.
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
