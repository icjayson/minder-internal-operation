import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { openaiVision } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "context-files";
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_CHARS = 200_000; // cap stored text so prompts stay bounded

// POST { itemId } → downloads the file, extracts text by MIME type, and stores
// it on context_items.body so the AI can read a single text field.
export async function POST(req: Request) {
  try {
    const { itemId } = (await req.json()) as { itemId?: string };
    if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const sb = supabase();
    const { data: item, error } = await sb.from("context_items").select("*").eq("id", itemId).single();
    if (error || !item) return NextResponse.json({ error: error?.message ?? "Item not found" }, { status: 404 });
    if (item.kind !== "file" || !item.storage_path)
      return NextResponse.json({ error: "Not a file item" }, { status: 400 });

    if (item.byte_size && item.byte_size > MAX_BYTES) {
      await mark(sb, itemId, "unsupported", null);
      return NextResponse.json({ status: "unsupported", reason: "file too large" });
    }

    const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(item.storage_path);
    if (dlErr || !blob) {
      await mark(sb, itemId, "failed", null);
      return NextResponse.json({ error: dlErr?.message ?? "Download failed" }, { status: 502 });
    }

    const mime = (item.mime_type ?? "").toLowerCase();
    const name = (item.file_name ?? "").toLowerCase();
    const buf = Buffer.from(await blob.arrayBuffer());

    let text: string | null = null;
    let status: "done" | "failed" | "unsupported" = "done";

    try {
      if (mime.startsWith("text/") || /\.(txt|md|csv|tsv|json|log)$/.test(name)) {
        text = buf.toString("utf8");
      } else if (mime === "application/pdf" || name.endsWith(".pdf")) {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(buf));
        const out = await extractText(pdf, { mergePages: true });
        text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
      } else if (
        mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        name.endsWith(".docx")
      ) {
        const mammoth = (await import("mammoth")).default;
        const out = await mammoth.extractRawText({ buffer: buf });
        text = out.value;
      } else if (mime.startsWith("image/")) {
        const dataUrl = `data:${item.mime_type};base64,${buf.toString("base64")}`;
        text = await openaiVision(
          dataUrl,
          "You are extracting research context for an industrial design-partner tracker. Transcribe ALL legible text, tables and numbers in this image, and briefly describe any diagrams, layouts or photos. Output plain text only — no preamble.",
        );
      } else {
        status = "unsupported";
      }
    } catch (e) {
      await mark(sb, itemId, "failed", `Extraction error: ${e instanceof Error ? e.message : "unknown"}`);
      return NextResponse.json({ status: "failed", error: e instanceof Error ? e.message : "unknown" });
    }

    if (status === "unsupported") {
      await mark(sb, itemId, "unsupported", null);
      return NextResponse.json({ status: "unsupported" });
    }

    const clean = (text ?? "")
      .replace(/\u0000/g, "")       // Postgres text rejects null bytes
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, MAX_CHARS);
    if (!clean) {
      await mark(sb, itemId, "unsupported", null);
      return NextResponse.json({ status: "unsupported", reason: "no text found" });
    }
    await mark(sb, itemId, "done", clean);
    return NextResponse.json({ status: "done", chars: clean.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

async function mark(
  sb: ReturnType<typeof supabase>,
  id: string,
  extraction_status: string,
  body: string | null,
) {
  const patch: Record<string, unknown> = { extraction_status };
  if (body !== null) patch.body = body;
  await sb.from("context_items").update(patch).eq("id", id);
}
