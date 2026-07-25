import { AppShell } from "@/app/components/app-shell";

// Shared shell for every dashboard route (sidebar + realtime store + drawers).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
