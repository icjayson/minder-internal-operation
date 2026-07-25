"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FactoriesProvider, useStore } from "@/lib/factories-store";
import { Sidebar } from "./sidebar";
import { FactoryDrawer } from "./factory-drawer";
import { NewFactoryDrawer } from "./new-factory-drawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <FactoriesProvider>
      <div className="flex min-h-screen bg-canvas text-ink">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
        <GlobalDrawers />
        <Suspense fallback={null}>
          <DeepLinkOpener />
        </Suspense>
      </div>
    </FactoriesProvider>
  );
}

function GlobalDrawers() {
  const {
    selectedFactoryId,
    selectedContactId,
    closeFactory,
    newFactoryOpen,
    closeNewFactory,
  } = useStore();
  return (
    <>
      {newFactoryOpen && <NewFactoryDrawer onClose={closeNewFactory} />}
      {selectedFactoryId && (
        <FactoryDrawer
          factoryId={selectedFactoryId}
          contactId={selectedContactId}
          onClose={closeFactory}
        />
      )}
    </>
  );
}

// Opens the factory drawer from ?factory=<id> (extension / shared links).
function DeepLinkOpener() {
  const params = useSearchParams();
  const { factories, openFactory } = useStore();
  const handled = useRef<string | null>(null);
  const id = params.get("factory");
  useEffect(() => {
    if (!id || !factories) return;
    if (handled.current === id) return;
    if (factories.some((f) => f.id === id)) {
      handled.current = id;
      openFactory(id);
    }
  }, [id, factories, openFactory]);
  return null;
}
