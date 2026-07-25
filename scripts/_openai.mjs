// Minimal OpenAI chat client via fetch — mirror of web/lib/openai.ts for the
// Node scripts. No SDK dependency.
//
// Env:
//   OPENAI_API_KEY   (required)
//   OPENAI_BASE_URL  (optional, default https://api.openai.com/v1)
//   OPENAI_MODEL     (optional, default gpt-4o-mini)

// openaiChat(prompt, { temperature, maxTokens, json }) → assistant text.
// Env is read at call time (not import time) so scripts that call loadEnv()
// after importing this module still pick up OPENAI_BASE_URL / OPENAI_MODEL.
export async function openaiChat(prompt, opts = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
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

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new Error("OpenAI returned no content");
  return text.trim();
}
