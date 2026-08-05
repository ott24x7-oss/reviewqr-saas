import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatDate, formatINR, timeAgo } from "@/lib/utils";
import { UserEditForm } from "./user-edit";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      businesses: {
        select: { id: true, name: true, slug: true, archived: true, createdAt: true }
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20
      },
      _count: { select: { businesses: true, payments: true } }
    }
  });
  if (!user) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to users
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">{user.name || user.email}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={user.role === "ADMIN" ? "destructive" : "outline"}>{user.role}</Badge>
          <Badge>{user.subscriptionTier}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UserEditForm
          user={{
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            trialEndsAt: user.trialEndsAt?.toISOString() || null,
            subscriptionEndsAt: user.subscriptionEndsAt?.toISOString() || null
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Account info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Joined</dt>
                <dd>{formatDate(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{user.phone || "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Businesses</dt>
                <dd>{user._count.businesses}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Payments</dt>
                <dd>{user._count.payments}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Trial ends</dt>
                <dd>{user.trialEndsAt ? formatDate(user.trialEndsAt) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Renews</dt>
                <dd>{user.subscriptionEndsAt ? formatDate(user.subscriptionEndsAt) : "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Businesses ({user.businesses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.businesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses yet.</p>
          ) : (
            <ul className="divide-y -mx-2">
              {user.businesses.map((b) => (
                <li key={b.id} className="px-2 py-2.5 flex justify-between text-sm">
                  <div>
                    <div className="font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">/r/{b.slug}</div>
                  </div>
                  <div className="text-right">
                    {b.archived && (
                      <Badge variant="outline" className="mb-1">
                        archived
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">{timeAgo(b.createdAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments ({user.payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {user.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-slate-800 text-xs text-muted-foreground">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Plan</th>
                    <th className="text-left py-2 px-2">Provider</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {user.payments.map((p) => (
                    <tr key={p.id} className="border-b dark:border-slate-800 last:border-0">
                      <td className="py-2 px-2">{formatDate(p.createdAt)}</td>
                      <td className="py-2 px-2">
                        {p.tier} ({p.periodMonths === 12 ? "yearly" : "monthly"})
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{p.provider}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatINR(p.amount)}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant={
                            p.status === "COMPLETED"
                              ? "success"
                              : p.status === "PENDING"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
