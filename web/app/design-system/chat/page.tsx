import type { Metadata } from "next";

import ChatDesignSystem from "./ChatDesignSystem";

export const metadata: Metadata = {
  title: "AI chat design system | Minder Ops",
  description: "Conversation primitives: transcripts, markers, and questionnaires.",
};

export default function ChatDesignSystemPage() {
  return <ChatDesignSystem />;
}
