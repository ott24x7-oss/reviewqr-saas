import { observe } from "@/lib/api/observe";
import { NextResponse } from "next/server";
import { openApiDocument } from "@/lib/api/openapi";

export const dynamic = "force-dynamic";

async function getHandler() {
  return NextResponse.json(openApiDocument());
}
export const GET = observe(getHandler);
