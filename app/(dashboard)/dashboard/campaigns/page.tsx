import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import { DEFAULT_TEMPLATES } from "@/lib/whatsapp";
import { ownedOrAssignedWhere } from "@/lib/tenant";
import { AppText } from "@/components/app-ui/i18n";
import { CampaignsClient } from "./campaigns-client";
import { requireAccountFeatureForRoute } from "@/lib/plans/dashboard-gate";
import { LockedFeature } from "@/components/app-ui/locked-feature";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const locked = await requireAccountFeatureForRoute(user.id, "/dashboard/campaigns", "campaigns");
  if (locked) return <LockedFeature state={locked} />;

  const businesses = await prisma.business.findMany({
    where: ownedOrAssignedWhere(user.id),
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
        <h1 className="text-2xl sm:text-3xl font-bold font-display"><AppText en="Campaigns" hi="कैंपेन" /></h1>
        <p className="text-sm text-muted-foreground">
          <AppText en="Send messages to customers who agreed to hear from you." hi="उन ग्राहकों को संदेश भेजें जिन्होंने आपसे संदेश पाने की सहमति दी है।" />
        </p>
      </div>

      {/* Template gallery */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> <AppText en="WhatsApp templates" hi="WhatsApp संदेश के नमूने" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(Object.entries(DEFAULT_TEMPLATES) as [string, string][]).map(([key, template]) => (
              <div key={key} className="rounded-lg border bg-secondary/40 p-3">
                <div className="text-xs font-medium text-muted-foreground capitalize mb-1">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{template}</pre>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <AppText en="Variables:" hi="वेरिएबल:" /> <code className="bg-secondary px-1 rounded">{"{{customerName}}"}</code>{" "}
            <code className="bg-secondary px-1 rounded">{"{{businessName}}"}</code>{" "}
            <code className="bg-secondary px-1 rounded">{"{{reviewUrl}}"}</code>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <AppText en="Rewards, coupons, and loyalty stamps may be tied only to private feedback or a visit. Never offer them in exchange for a public review." hi="इनाम, कूपन और लॉयल्टी स्टैम्प सिर्फ़ निजी प्रतिक्रिया या विज़िट से जोड़ें। सार्वजनिक रिव्यू के बदले इन्हें कभी न दें।" />
          </p>
        </CardContent>
      </Card>

      <CampaignsClient
        businesses={businesses.map(({ id, name }) => ({ id, name }))}
        campaigns={campaigns.map((campaign) => ({ ...campaign, createdAt: campaign.createdAt.toISOString() }))}
      />
    </div>
  );
}
