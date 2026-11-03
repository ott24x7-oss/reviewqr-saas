import { NextRequest } from "next/server";
import { pairGateway } from "@/lib/sms-gateway-http";

export const runtime = "nodejs";
export const POST = (req: NextRequest) => pairGateway(req);
