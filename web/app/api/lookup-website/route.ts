import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// POST { company_name: string } → { domain: string | null, website_url: string | null }
// Uses Gemini to map a company name to its official domain.
// CORS-open so the Chrome extension can call it from any origin.

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const { company_name } = (await req.json()) as { company_name?: string };
    if (!company_name || company_name.trim().length < 2) {
      return NextResponse.json(
        { error: "company_name required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500, headers: CORS_HEADERS },
      );
    }

    const genai = new GoogleGenerativeAI(apiKey);
    const model = genai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0, maxOutputTokens: 512 },
    });

    const prompt = `What is the official website domain for the company "${company_name}"?

Rules:
- Respond with ONLY the domain (no https://, no trailing slash, no path), e.g. "palantir.com" or "jpmorgan.com".
- If the name is ambiguous or you are not highly confident, respond with exactly "unknown".
- Do not invent domains. If you don't know, say "unknown".
- Do NOT include explanation, prefix, or markdown — just the domain string or "unknown".`;

    const res = await model.generateContent(prompt);
    const raw = res.response.text().trim().toLowerCase();

    // Basic validation: must look like a bare domain.
    const domainMatch = raw.match(/^([a-z0-9][a-z0-9-]*\.)+[a-z]{2,}$/);
    if (!domainMatch || raw === "unknown") {
      return NextResponse.json(
        { domain: null, website_url: null, raw },
        { headers: CORS_HEADERS },
      );
    }

    const domain = domainMatch[0];
    return NextResponse.json(
      { domain, website_url: `https://${domain}` },
      { headers: CORS_HEADERS },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
