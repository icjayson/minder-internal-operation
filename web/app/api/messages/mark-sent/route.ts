import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

// POST { messageId } → mark sent, log the touch and advance sequence cadence.
export async function POST(req: Request) {
  try {
    const { messageId } = (await req.json()) as { messageId?: string };
    if (!messageId)
      return NextResponse.json({ error: "messageId required" }, { status: 400 });

    const { data, error } = await supabase().rpc("mark_message_sent", {
      p_message_id: messageId,
    });
    if (error) {
      const status = error.message.includes("opted out") ? 409
        : error.message.includes("not found") ? 404
          : 500;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
