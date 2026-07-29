// Minimal OpenAI chat client via fetch — no SDK dependency needed.
//
// Env:
//   OPENAI_API_KEY   (required, server-only)
//   OPENAI_BASE_URL  (optional, default https://api.openai.com/v1)
//   OPENAI_MODEL     (optional, default gpt-4o-mini)

export interface OpenaiOptions {
  temperature?: number;
  maxTokens?: number;
  json?: boolean; // request a JSON-object response (prompt must mention "json")
  signal?: AbortSignal;
  timeoutMs?: number;
}

// Reasoning models (gpt-5*) spend hidden "reasoning tokens" from the same
// max_tokens budget BEFORE emitting any visible content. With a large prompt
// (e.g. an uploaded context file) the reasoning alone can exhaust a tight
// budget, so the response finishes with reason "length" and EMPTY content —
// which then blows up JSON.parse downstream. We reserve headroom on top of the
// caller's intended output size. max_tokens is only a cap, so unused headroom
// costs nothing.
const REASONING_HEADROOM = 3000;

// GPT-5 reasoning models reject non-default sampling temperatures on Chat
// Completions (the API default is 1). Omit a custom value instead of letting one
// caller break every AI-backed route. Earlier model families keep the caller's
// requested temperature.
export function temperatureForModel(
  model: string,
  requested: number | undefined,
): number | undefined {
  if (requested === undefined) return undefined;
  const isGpt5Family = /^gpt-5(?:[.-]|$)/i.test(model);
  return isGpt5Family && requested !== 1 ? undefined : requested;
}

// Sends a single-turn prompt and returns the assistant's text content.
// Throws on missing key or non-2xx responses (status is in the message so
// callers can retry on 429/503). Env is read at call time.
export async function openaiChat(
  prompt: string,
  opts: OpenaiOptions = {},
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const temperature = temperatureForModel(model, opts.temperature);
  const timeoutSignal = opts.timeoutMs
    ? AbortSignal.timeout(opts.timeoutMs)
    : undefined;
  const signal = opts.signal && timeoutSignal
    ? AbortSignal.any([opts.signal, timeoutSignal])
    : opts.signal ?? timeoutSignal;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      ...(temperature !== undefined ? { temperature } : {}),
      max_tokens: (opts.maxTokens ?? 2048) + REASONING_HEADROOM,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
  };
  const choice = data.choices?.[0];
  const text = choice?.message?.content;
  if (typeof text !== "string" || text.trim() === "") {
    // Empty content almost always means the reasoning budget was exhausted
    // before any visible tokens were produced (finish_reason "length").
    throw new Error(
      choice?.finish_reason === "length"
        ? "OpenAI response was truncated before any content — raise maxTokens for this call"
        : "OpenAI returned no content",
    );
  }
  return text.trim();
}

// Vision: transcribe/describe an image (data: URL) into plain text for context.
// gpt-4o-mini is multimodal, so the default model works without a tier change.
export async function openaiVision(
  imageDataUrl: string,
  instruction: string,
  opts: { maxTokens?: number } = {},
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1200,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenAI returned no content");
  return text.trim();
}
