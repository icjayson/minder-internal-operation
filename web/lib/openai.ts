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

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenAI returned no content");
  return text.trim();
}
