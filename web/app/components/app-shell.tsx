"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FactoriesProvider, useStore } from "@/lib/factories-store";
import { Sidebar } from "./sidebar";
import { FactoryDrawer } from "./factory-drawer";
import { NewFactoryDrawer } from "./new-factory-drawer";
import { NetworkDrawer } from "./network-drawer";
import { NewNetworkDrawer } from "./new-network-drawer";

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
    selectedNetworkId,
    closeFactory,
    closeNetwork,
    newFactoryOpen,
    closeNewFactory,
    newNetworkOpen,
    closeNewNetwork,
  } = useStore();
  return (
    <>
      {newFactoryOpen && <NewFactoryDrawer onClose={closeNewFactory} />}
      {newNetworkOpen && <NewNetworkDrawer onClose={closeNewNetwork} />}
      {selectedFactoryId && (
        <FactoryDrawer
          factoryId={selectedFactoryId}
          contactId={selectedContactId}
          onClose={closeFactory}
        />
      )}
      {selectedNetworkId && (
        <NetworkDrawer networkId={selectedNetworkId} onClose={closeNetwork} />
      )}
    </>
  );
}

// Opens a drawer from ?factory=<id> or ?network=<id> (extension / shared / alert links).
function DeepLinkOpener() {
  const params = useSearchParams();
  const { factories, networks, openFactory, openNetwork } = useStore();
  const handled = useRef<string | null>(null);
  const factoryId = params.get("factory");
  const networkId = params.get("network");
  useEffect(() => {
    if (factoryId && factories) {
      if (handled.current === factoryId) return;
      if (factories.some((f) => f.id === factoryId)) {
        handled.current = factoryId;
        openFactory(factoryId);
      }
      return;
    }
    if (networkId && networks) {
      if (handled.current === networkId) return;
      if (networks.some((n) => n.id === networkId)) {
        handled.current = networkId;
        openNetwork(networkId);
      }
    }
  }, [factoryId, networkId, factories, networks, openFactory, openNetwork]);
  return null;
}
