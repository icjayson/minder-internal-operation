"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { FactoriesProvider, useStore } from "@/lib/factories-store";
import { Toaster } from "@/design-system/components/sonner";
import { TooltipProvider } from "@/design-system/components/tooltip";
import { AppThemeProvider, useAppTheme } from "./theme";
import { Sidebar } from "./sidebar";
import { FactoryDrawer } from "./factory-drawer";
import { NewFactoryDrawer } from "./new-factory-drawer";
import { NetworkDrawer } from "./network-drawer";
import { NewNetworkDrawer } from "./new-network-drawer";
import { FundraisingDrawer } from "./fundraising-drawer";
import { NewFundraisingDrawer } from "./new-fundraising-drawer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AppThemeProvider>
      <TooltipProvider>
        <FactoriesProvider>
          <div className="flex min-h-screen bg-canvas text-ink">
            <Sidebar />
            <main className="flex-1 min-w-0">{children}</main>
            <GlobalDrawers />
            <AppToaster />
            <Suspense fallback={null}>
              <DeepLinkOpener />
            </Suspense>
          </div>
        </FactoriesProvider>
      </TooltipProvider>
    </AppThemeProvider>
  );
}

/* The vendored Toaster reads its sky from next-themes, which this app does not
   use — left alone it falls back to "system" and can paint dark-theme text onto
   a light toast. Handing it the app's own sky fixes that; the component spreads
   props last, so this wins without touching the vendored source. */
function AppToaster() {
  const { theme } = useAppTheme();
  return <Toaster theme={theme} richColors position="bottom-right" />;
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
    selectedFundraisingId,
    closeFundraising,
    newFundraisingTrack,
    closeNewFundraising,
    selectedCustomerId,
    closeCustomer,
    newCustomerOpen,
    closeNewCustomer,
  } = useStore();
  return (
    <>
      {newFactoryOpen && <NewFactoryDrawer onClose={closeNewFactory} />}
      {newCustomerOpen && <NewFactoryDrawer asCustomer onClose={closeNewCustomer} />}
      {newNetworkOpen && <NewNetworkDrawer onClose={closeNewNetwork} />}
      {newFundraisingTrack && (
        <NewFundraisingDrawer track={newFundraisingTrack} onClose={closeNewFundraising} />
      )}
      {selectedFactoryId && (
        <FactoryDrawer
          factoryId={selectedFactoryId}
          contactId={selectedContactId}
          onClose={closeFactory}
        />
      )}
      {selectedCustomerId && (
        <FactoryDrawer
          factoryId={selectedCustomerId}
          basePath="/customers"
          showNotifications={false}
          onClose={closeCustomer}
        />
      )}
      {selectedNetworkId && (
        <NetworkDrawer networkId={selectedNetworkId} onClose={closeNetwork} />
      )}
      {selectedFundraisingId && (
        <FundraisingDrawer leadId={selectedFundraisingId} onClose={closeFundraising} />
      )}
    </>
  );
}

// Opens a drawer from ?factory=<id> or ?network=<id> (extension / shared / alert links).
function DeepLinkOpener() {
  const params = useSearchParams();
  const { factories, networks, fundraisingLeads, openFactory, openNetwork, openFundraising } = useStore();
  const handled = useRef<string | null>(null);
  const factoryId = params.get("factory");
  const networkId = params.get("network");
  const fundraisingId = params.get("investor") ?? params.get("competition");
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
      return;
    }
    if (fundraisingId && fundraisingLeads) {
      if (handled.current === fundraisingId) return;
      if (fundraisingLeads.some((l) => l.id === fundraisingId)) {
        handled.current = fundraisingId;
        openFundraising(fundraisingId);
      }
    }
  }, [factoryId, networkId, fundraisingId, factories, networks, fundraisingLeads, openFactory, openNetwork, openFundraising]);
  return null;
}
