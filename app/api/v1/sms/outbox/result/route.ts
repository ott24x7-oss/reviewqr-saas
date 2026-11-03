import { NextRequest } from "next/server";
import { outboxResult } from "@/lib/sms-gateway-http";

export const runtime = "nodejs";
export const POST = (req: NextRequest) => outboxResult(req);
