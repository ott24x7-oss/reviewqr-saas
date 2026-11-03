import { NextRequest } from "next/server";
import { observeSms } from "@/lib/sms-gateway-http";

export const runtime = "nodejs";
export const POST = (req: NextRequest) => observeSms(req);
