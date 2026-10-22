import type { MetadataRoute } from "next";
import { listPublicPlans } from "@/lib/plans/public";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let planPaths: string[] = [];
  try {
    const plans = await listPublicPlans();
    planPaths = plans.map((plan) => `/plans/${plan.slug}`);
  } catch {
    planPaths = [];
  }
  const routes = [
    "",
    "/how-it-works",
    ...planPaths,
    "/about",
    "/demo",
    "/privacy",
    "/terms",
    "/refund",
    "/login",
    "/register",
    "/account/delete"
  ];
  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/plans/") ? 0.8 : 0.6
  }));
}
