import assert from "node:assert/strict";
import test from "node:test";
import { openaiChat, temperatureForModel } from "../lib/openai.ts";

test("GPT-5 models omit unsupported custom temperatures", () => {
  assert.equal(temperatureForModel("gpt-5", 0.4), undefined);
  assert.equal(temperatureForModel("gpt-5-mini", 0.4), undefined);
  assert.equal(temperatureForModel("gpt-5-codex", 0.5), undefined);
});

test("GPT-5 accepts its default temperature and earlier models keep custom values", () => {
  assert.equal(temperatureForModel("gpt-5-mini", 1), 1);
  assert.equal(temperatureForModel("gpt-4o-mini", 0.4), 0.4);
  assert.equal(temperatureForModel("gpt-4.1-mini", 0.5), 0.5);
  assert.equal(temperatureForModel("gpt-5-mini", undefined), undefined);
});

test("openaiChat omits a custom temperature from the GPT-5 request payload", async () => {
  const previous = {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL,
    fetch: globalThis.fetch,
  };
  let requestBody: Record<string, unknown> | undefined;

  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = "https://openai.test/v1";
  process.env.OPENAI_MODEL = "gpt-5-mini";
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "summary" }, finish_reason: "stop" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    assert.equal(
      await openaiChat("Summarise this factory", { temperature: 0.4, maxTokens: 350 }),
      "summary",
    );
  } finally {
    restoreEnv("OPENAI_API_KEY", previous.apiKey);
    restoreEnv("OPENAI_BASE_URL", previous.baseUrl);
    restoreEnv("OPENAI_MODEL", previous.model);
    globalThis.fetch = previous.fetch;
  }

  assert.equal(requestBody?.model, "gpt-5-mini");
  assert.equal("temperature" in (requestBody ?? {}), false);
  assert.equal(requestBody?.max_tokens, 3350);
});

test("openaiChat forwards cancellation to the upstream request", async () => {
  const previous = {
    apiKey: process.env.OPENAI_API_KEY,
    fetch: globalThis.fetch,
  };
  const controller = new AbortController();
  let requestSignal: AbortSignal | null | undefined;

  process.env.OPENAI_API_KEY = "test-key";
  globalThis.fetch = async (_input, init) => {
    requestSignal = init?.signal;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "summary" }, finish_reason: "stop" }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    await openaiChat("Summarise this factory", { signal: controller.signal });
  } finally {
    restoreEnv("OPENAI_API_KEY", previous.apiKey);
    globalThis.fetch = previous.fetch;
  }

  assert.equal(requestSignal, controller.signal);
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
