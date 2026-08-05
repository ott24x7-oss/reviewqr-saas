import { getAiConfig } from "@/lib/settings";
import { maskSecret } from "@/lib/admin";
import { AiConfigForm } from "./ai-form";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const cfg = await getAiConfig();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">AI Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Connect any OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, or your own
          endpoint). When enabled, happy customers who tap 4–5★ get a few quick questions and
          AI-written review suggestions to copy before heading to Google. Turn it on per business
          in <span className="font-medium text-foreground">Dashboard → Business → AI Reviews</span>.
        </p>
      </div>
      <AiConfigForm initial={{ ...cfg, apiKey: maskSecret(cfg.apiKey) }} />
    </div>
  );
}
