import type { Metadata } from "next";
import HomePage from "@/app/page";
import { SEO_STATIC_ROUTES, buildSeoMetadata, routeDescription } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const route = SEO_STATIC_ROUTES[0];
  return buildSeoMetadata({ path: "/", locale: "hi", title: route.titleHi, description: routeDescription("/", "hi"), translated: route.translated });
}

export default function HindiHomePage() {
  return <HomePage />;
}
