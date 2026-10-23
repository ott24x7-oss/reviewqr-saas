import { observe } from "@/lib/api/observe";
import { NextRequest } from "next/server";
import { requireV1User, v1Data } from "@/lib/api/v1";
import { prisma } from "@/lib/db";
import { articleMatches } from "@/lib/help/audience";

export const dynamic = "force-dynamic";

function present(row: {
  id: string;
  slug: string;
  category: string;
  language: string;
  title: string;
  body: string;
  videoUrl: string;
  contextKey: string;
}) {
  return row;
}

async function getHandler(req: NextRequest) {
  const auth = await requireV1User(req);
  if (!auth.ok) return auth.response;
  const language = req.nextUrl.searchParams.get("lang") === "hi" ? "hi" : "en";
  const context = (req.nextUrl.searchParams.get("context") || "").slice(0, 40);
  const query = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
  const rows = await prisma.helpArticle.findMany({
    where: {
      published: true,
      language,
      ...(context ? { contextKey: context } : {})
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    take: 100,
    select: {
      id: true,
      slug: true,
      category: true,
      language: true,
      title: true,
      body: true,
      videoUrl: true,
      contextKey: true
    }
  });
  return v1Data(rows.filter((row) => articleMatches(row, query)).map(present));
}

export const GET = observe(getHandler);
