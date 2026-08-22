import type { Metadata } from "next";

import styles from "./page.module.css";
import { DesignSystemShell } from "./shell";

export const metadata: Metadata = {
  title: "Design Systems | Minder Ops",
  description: "Minder's general, dashboard, AI chat, and component-library references.",
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.designSystem}>
      <DesignSystemShell>{children}</DesignSystemShell>
    </main>
  );
}
