import { TodosProvider } from "@/lib/todos-store";

// The store is scoped to this route rather than mounted in AppShell:
// factories-store is global because the sidebar counts need it everywhere,
// but todos are needed here alone and no other page should pay to load them.
export default function TodosLayout({ children }: { children: React.ReactNode }) {
  return <TodosProvider>{children}</TodosProvider>;
}
