import { cookies } from "next/headers";

import { AppShell } from "@/app/components/app-shell";

// Shared shell for every dashboard route (sidebar + realtime store + drawers).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The sidebar persists its open state in a cookie. Reading it here rather
  // than on the client is what keeps a collapsed sidebar from flashing open
  // on first paint.
  const store = await cookies();
  const sidebarOpen = store.get("sidebar_state")?.value !== "false";

  return <AppShell sidebarOpen={sidebarOpen}>{children}</AppShell>;
}
