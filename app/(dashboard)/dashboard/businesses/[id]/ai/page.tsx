import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAiConfig } from "@/lib/settings";
import { AiReviewsClient } from "./ai-client";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BusinessAiPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      industry: true,
      website: true,
      services: true,
      aiReviewsEnabled: true,
      googleReviewUrl: true
    }
  });
  if (!business) notFound();

  const ai = await getAiConfig();

  return (
    <div className="space-y-5">
      <Link
        href={`/dashboard/businesses/${business.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {business.name}
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">AI Reviews</h1>
        <p className="text-sm text-muted-foreground">
          When a customer taps 4–5★, AI asks a couple of quick questions, then suggests ready-to-post
          Google reviews tailored to your business — each with a Copy button. Give the AI good context
          below so the questions and reviews sound right.
        </p>
      </div>

      <AiReviewsClient
        business={{
          id: business.id,
          aiReviewsEnabled: business.aiReviewsEnabled,
          services: business.services || "",
          description: business.description || "",
          industry: business.industry || "",
          website: business.website || "",
          hasGoogleUrl: !!business.googleReviewUrl
        }}
        platformAiEnabled={ai.enabled && !!ai.apiKey}
      />
    </div>
  );
}
