import { NextRequest } from "next/server";
import { heartbeat as handleHeartbeat } from "@/lib/sms-gateway-http";

export const runtime = "nodejs";
export const POST = (req: NextRequest) => handleHeartbeat(req);
