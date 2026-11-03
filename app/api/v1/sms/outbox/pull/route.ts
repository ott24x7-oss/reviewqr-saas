import { NextRequest } from "next/server";
import { pullOutbox } from "@/lib/sms-gateway-http";

export const runtime = "nodejs";
export const POST = (req: NextRequest) => pullOutbox(req);
