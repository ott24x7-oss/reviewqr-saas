import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAiConfig } from "@/lib/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, AlertTriangle, CheckCircle2, Building2, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardAiPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [businesses, ai] = await Promise.all([
    prisma.business.findMany({
      where: { ownerId: user.id, archived: false },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        logo: true,
        aiReviewsEnabled: true,
        services: true,
        googleReviewUrl: true
      }
    }),
    getAiConfig()
  ]);

  const aiAvailable = ai.enabled && !!ai.apiKey;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-600" /> AI Reviews
        </h1>
        <p className="text-sm text-muted-foreground">
          When a customer taps 4–5★, AI asks a couple of quick questions and drafts ready-to-post
          Google reviews tailored to each business — with a Copy button. Turn it on and add training
          details per business below.
        </p>
      </div>

      {!aiAvailable && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            The AI review assistant isn't active on this platform yet. Once it's connected, enabling
            it per business below will start working automatically. You can pre-configure your
            businesses now.
          </span>
        </div>
      )}

      {businesses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Create a business first, then set up AI reviews for it.
            </p>
            <Button asChild variant="gradient" className="mt-4">
              <Link href="/dashboard/businesses/new">
                <Plus className="h-4 w-4" /> Add a business
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {businesses.map((b) => {
            const configured = !!(b.services && b.services.trim());
            return (
              <Card key={b.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {b.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo} alt={b.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-bold text-muted-foreground">
                          {b.name[0]}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{b.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {configured ? "Training details added" : "No training details yet"}
                        </div>
                      </div>
                    </div>
                    <span
                      className={
                        b.aiReviewsEnabled
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold shrink-0"
                          : "inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[11px] font-semibold shrink-0"
                      }
                    >
                      {b.aiReviewsEnabled ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" /> On
                        </>
                      ) : (
                        "Off"
                      )}
                    </span>
                  </div>

                  {!b.googleReviewUrl && (
                    <p className="mt-3 text-[11px] text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Add a Google review link in business settings.
                    </p>
                  )}

                  <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                    <Link href={`/dashboard/businesses/${b.id}/ai`}>
                      {b.aiReviewsEnabled ? "Manage AI setup" : "Set up AI reviews"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
