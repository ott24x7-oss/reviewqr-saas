/**
 * AI helper for review assistance. Talks to any OpenAI-compatible
 * chat-completions endpoint (OpenAI, OpenRouter, Groq, Together, local, …)
 * configured by the admin in Admin → AI.
 *
 * Two capabilities:
 *   generateQuestions() — 3–4 quick tap-to-answer questions tailored to the biz
 *   generateReviews()   — 4–5 ready-to-paste Google reviews from the answers
 *
 * All functions THROW on failure; callers decide the fallback (e.g. static
 * review templates) so the customer flow never dead-ends.
 */
import type { AiConfig } from "./settings";

export type BusinessContext = {
  name: string;
  industry?: string | null;
  description?: string | null;
  services?: string | null;
  city?: string | null;
  website?: string | null;
};

export type AiQuestion = { id: string; question: string; options: string[] };

function contextBlock(ctx: BusinessContext): string {
  const lines = [
    `Business name: ${ctx.name}`,
    ctx.industry ? `Industry / category: ${ctx.industry}` : "",
    ctx.city ? `City: ${ctx.city}` : "",
    ctx.description ? `About: ${ctx.description}` : "",
    ctx.services ? `Services / offerings: ${ctx.services}` : "",
    ctx.website ? `Website: ${ctx.website}` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

/** Low-level call. Returns the assistant message content string. */
async function chat(
  cfg: AiConfig,
  messages: Array<{ role: "system" | "user"; content: string }>,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  if (!cfg.enabled || !cfg.apiKey) throw new Error("AI not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${cfg.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.8,
        max_tokens: opts.maxTokens ?? 700,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty AI response");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

/** Pull a JSON object/array out of a model response, tolerating stray prose. */
function parseJson(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    throw new Error("Could not parse AI JSON");
  }
}

export async function generateQuestions(
  cfg: AiConfig,
  ctx: BusinessContext
): Promise<AiQuestion[]> {
  const system =
    "You help a happy customer quickly describe their positive experience so a great Google review can be drafted. " +
    "Return ONLY JSON. Keep it warm, simple, and specific to the business.";
  const user =
    `${contextBlock(ctx)}\n\n` +
    "Generate 3 to 4 quick multiple-choice questions a satisfied customer can tap through in seconds. " +
    "Each question must be specific to THIS business's services and have 3-4 short, positive answer options " +
    "(single words or very short phrases). " +
    'Respond as JSON: {"questions":[{"question":"...","options":["...","..."]}]}';

  const raw = await chat(cfg, [
    { role: "system", content: system },
    { role: "user", content: user }
  ], { maxTokens: 500, temperature: 0.6 });

  const data = parseJson(raw);
  const arr = Array.isArray(data) ? data : data.questions;
  if (!Array.isArray(arr)) throw new Error("Bad questions shape");
  const questions: AiQuestion[] = arr
    .slice(0, 4)
    .map((q: any, i: number) => ({
      id: `q${i}`,
      question: String(q.question || q.q || "").trim(),
      options: (Array.isArray(q.options) ? q.options : [])
        .map((o: any) => String(o).trim())
        .filter(Boolean)
        .slice(0, 4)
    }))
    .filter((q: AiQuestion) => q.question && q.options.length >= 2);
  if (questions.length === 0) throw new Error("No usable questions");
  return questions;
}

export async function generateReviews(
  cfg: AiConfig,
  ctx: BusinessContext,
  rating: number,
  answers: Array<{ question: string; answer: string }>
): Promise<string[]> {
  const answerBlock = answers.length
    ? answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n")
    : "(no specific answers given)";

  const system =
    "You write authentic, natural-sounding Google reviews in the customer's voice. " +
    "First person, warm, believable, no emojis, no hashtags, no markdown. " +
    "Each review 2-4 sentences. Vary length and wording. Return ONLY JSON.";
  const user =
    `${contextBlock(ctx)}\n\n` +
    `The customer gave ${rating} out of 5 stars. What they highlighted:\n${answerBlock}\n\n` +
    "Write 5 distinct, ready-to-post Google review options this happy customer could use. " +
    "Mention the business by name naturally in some of them, reference the services/answers, " +
    "and keep each one genuine and easy to relate to. " +
    'Respond as JSON: {"reviews":["...","...","...","...","..."]}';

  const raw = await chat(cfg, [
    { role: "system", content: system },
    { role: "user", content: user }
  ], { maxTokens: 800, temperature: 0.9 });

  const data = parseJson(raw);
  const arr = Array.isArray(data) ? data : data.reviews;
  if (!Array.isArray(arr)) throw new Error("Bad reviews shape");
  const reviews = arr
    .map((r: any) => String(r).trim())
    .filter((r: string) => r.length > 10)
    .slice(0, 5);
  if (reviews.length === 0) throw new Error("No usable reviews");
  return reviews;
}
