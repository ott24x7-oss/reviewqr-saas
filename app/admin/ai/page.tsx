import { loadAdminAiSettings } from "@/lib/admin/channel-settings";
import { AiConfigForm } from "./ai-form";
import Link from "next/link";
import { ImageAiForm } from "./image-ai-form";
import { loadAdminImageAiSettings } from "@/lib/admin/image-ai-settings";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const [cfg, imageCfg] = await Promise.all([loadAdminAiSettings(), loadAdminImageAiSettings()]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">AI Reviews</h1>
        <p className="text-sm text-muted-foreground">
          Connect any OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, or your own
          endpoint). When enabled, AI can clean up words a customer already wrote. The customer
          edits and copies that suggestion. Nothing is posted for them. Turn it on per business
          in <span className="font-medium text-foreground">Dashboard → Business → AI Reviews</span>.
        </p>
      </div>
      <AiConfigForm initial={cfg} />
      <div className="flex flex-wrap gap-4 text-sm"><Link className="underline" href="/admin/ai/images">Review generated item photos</Link></div>
      <ImageAiForm initial={imageCfg} />
    </div>
  );
}
