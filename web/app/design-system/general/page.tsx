import type { Metadata } from "next";

import MinderDesignSystem from "./MinderDesignSystem";

export const metadata: Metadata = {
  title: "General design system | Minder Ops",
  description: "Minder's tokens, components, and the rules that hold them together.",
};

export default function GeneralDesignSystemPage() {
  return <MinderDesignSystem />;
}
