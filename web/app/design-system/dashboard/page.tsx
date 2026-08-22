import type { Metadata } from "next";

import ChartGallery from "../charts/ChartGallery";

export const metadata: Metadata = {
  title: "Dashboard design system | Minder Ops",
  description: "The 68 vendored shadcn chart blocks, browsable by category.",
};

export default function DashboardDesignSystemPage() {
  return <ChartGallery />;
}
