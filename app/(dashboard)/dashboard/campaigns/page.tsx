import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Mail, Plus } from "lucide-react";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";
import { absoluteUrl, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businesses = await prisma.business.findMany({
    where: { ownerId: user.id, archived: false },
    select: { id: true, name: true, slug: true },
    take: 20
  });

  const campaigns = await prisma.campaign.findMany({
    where: { businessId: { in: businesses.map((b) => b.id) } },
    include: { business: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Send review requests in bulk via WhatsApp & Email
        </p>
      </div>

      {/* Template gallery */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> WhatsApp templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.entries(DEFAULT_TEMPLATES) as [string, string][]).map(([key, template]) => (
              <div key={key} className="rounded-lg border border-border bg-elevated/40 p-3">
                <div className="text-xs font-medium text-muted-foreground capitalize mb-1">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{template}</pre>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Variables: <code className="bg-elevated px-1 rounded">{"{{customerName}}"}</code>{" "}
            <code className="bg-elevated px-1 rounded">{"{{businessName}}"}</code>{" "}
            <code className="bg-elevated px-1 rounded">{"{{reviewUrl}}"}</code>
          </p>
        </CardContent>
      </Card>

      {/* Campaigns list */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Your campaigns</h2>
        <Button size="sm" variant="gradient" disabled title="Coming in next release">
          <Plus className="h-3.5 w-3.5" /> New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Send className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Use the templates above to start manually — bulk campaigns coming soon.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant={c.status === "ACTIVE" ? "success" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.business.name} · {formatDate(c.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>📤 {c.sent}</span>
                  <span>👁 {c.opened}</span>
                  <span>⭐ {c.reviewed}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
