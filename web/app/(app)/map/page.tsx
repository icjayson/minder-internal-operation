"use client";

import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/factories-store";
import { SelectControl } from "@/app/components/controls";
import { MapCanvas } from "@/app/components/map-canvas";

export default function MapPage() {
  const {
    networks, factories, verticals, notifications,
    contactsOf, contactsOfNetwork, factoriesOfNetwork,
    openNetwork, openFactory, openContact, updateFactory,
  } = useStore();

  const [vertical, setVertical] = useState("All");
  const [grade, setGrade] = useState("All");
  const [showContacts, setShowContacts] = useState(false);
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");

  // Keep the canvas in step with the app's theme toggle.
  useEffect(() => {
    const read = () =>
      setColorMode(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const alertIds = useMemo(() => {
    const s = new Set<string>();
    for (const n of notifications ?? []) {
      if (n.read_at) continue;
      if (n.factory_id) s.add(n.factory_id);
      if (n.network_id) s.add(n.network_id);
      if (n.contact_id) s.add(n.contact_id);
    }
    return s;
  }, [notifications]);

  const loading = factories === null;

  return (
    <div className="h-screen flex flex-col">
      <header className="shrink-0 border-b border-border px-8 py-4 bg-card/40">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="mr-auto">
            <div className="text-[10px] tabular-nums uppercase tracking-[0.14em] text-primary">Map · live</div>
            <h1 className="text-[20px] font-display text-foreground leading-tight">Relationship map</h1>
          </div>
          <SelectControl value={vertical} onChange={setVertical}
            options={[{ value: "All", label: "All verticals" }, ...verticals.map((v) => ({ value: v.id, label: v.name }))]} />
          <SelectControl value={grade} onChange={setGrade}
            options={[{ value: "All", label: "All grades" }, { value: "A", label: "A-grade" }, { value: "B", label: "B-grade" }, { value: "C", label: "C-grade" }]} />
          <button onClick={() => setShowContacts((s) => !s)}
            className={`h-9 px-4 rounded-full text-[13px] font-medium cursor-pointer border transition-colors ${
              showContacts ? "bg-primary text-primary-foreground border-primary" : "border-border-strong bg-muted text-foreground/80 hover:text-foreground"
            }`}>
            {showContacts ? "Hide contacts" : "Show contacts"}
          </button>
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-1.5">
          Network → Factory → Contact. Click a node to open it · drag a factory onto a network to link it (onto “Direct” to unlink) · amber dot = open alert.
        </p>
      </header>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground tabular-nums uppercase tracking-wider">Loading map…</div>
        ) : (
          <MapCanvas
            networks={networks ?? []}
            factories={factories ?? []}
            contactsOf={contactsOf}
            contactsOfNetwork={contactsOfNetwork}
            factoriesOfNetwork={factoriesOfNetwork}
            alertIds={alertIds}
            filters={{ vertical, grade, showContacts }}
            colorMode={colorMode}
            onOpen={(kind, id) => {
              if (kind === "network") openNetwork(id);
              else if (kind === "factory") openFactory(id);
              else if (kind === "contact") openContact(id);
            }}
            onReparent={(factoryId, networkId) => updateFactory(factoryId, { network_id: networkId })}
          />
        )}
      </div>
    </div>
  );
}
