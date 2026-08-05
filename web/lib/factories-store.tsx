"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  Activity,
  Contact,
  Factory,
  FundraisingLead,
  FundraisingTrack,
  Network,
  Notification,
  Stage,
  Vertical,
} from "@/lib/types";
import { FUNDRAISING_TRACKS } from "@/lib/types";
import { highestStage } from "@/lib/stage";
import { visibleFactoryActivities } from "@/lib/activity";
import { supabase } from "@/lib/supabase";

type Ctx = {
  verticals: Vertical[];
  networks: Network[] | null;
  factories: Factory[] | null;
  contacts: Contact[] | null;
  activities: Activity[] | null;
  notifications: Notification[] | null;
  fundraisingLeads: FundraisingLead[] | null;
  error: string | null;

  factory: (id: string | null) => Factory | null;
  network: (id: string | null) => Network | null;
  contactsOf: (factoryId: string) => Contact[];
  contactsOfNetwork: (networkId: string) => Contact[];
  factoriesOfNetwork: (networkId: string) => Factory[];
  activitiesOf: (factoryId: string) => Activity[];
  activitiesOfNetwork: (networkId: string) => Activity[];
  verticalName: (id: string | null) => string;
  networkName: (id: string | null) => string;

  updateFactory: (id: string, patch: Partial<Factory>) => Promise<void>;
  deleteFactory: (id: string) => Promise<void>;
  updateNetwork: (id: string, patch: Partial<Network>) => Promise<void>;
  deleteNetwork: (id: string) => Promise<void>;
  updateContact: (id: string, patch: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  // Contact changes can roll up the factory stage, while direct factory-stage
  // changes remain factory-level actions.
  setContactStage: (id: string, stage: Stage) => Promise<void>;
  setFactoryStage: (factoryId: string, stage: Stage) => Promise<void>;
  addContact: (factoryId: string, patch: Partial<Contact>) => Promise<void>;
  addNetworkContact: (networkId: string, patch: Partial<Contact>) => Promise<void>;
  addActivity: (factoryId: string, patch: Partial<Activity>) => Promise<void>;
  addNetworkActivity: (networkId: string, patch: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  // Fundraising tracker (two isolated tracks: investors + competitions).
  fundraisingLead: (id: string | null) => FundraisingLead | null;
  activitiesOfFundraising: (track: FundraisingTrack, id: string) => Activity[];
  addFundraisingActivity: (track: FundraisingTrack, id: string, patch: Partial<Activity>) => Promise<void>;
  createFundraisingLead: (
    track: FundraisingTrack,
    patch: Partial<FundraisingLead>,
  ) => Promise<FundraisingLead | null>;
  updateFundraisingLead: (
    track: FundraisingTrack,
    id: string,
    patch: Partial<FundraisingLead>,
  ) => Promise<void>;
  deleteFundraisingLead: (track: FundraisingTrack, id: string) => Promise<void>;

  selectedFactoryId: string | null;
  selectedContactId: string | null;
  selectedNetworkId: string | null;
  openFactory: (id: string) => void;
  openContact: (id: string) => void;
  openNetwork: (id: string) => void;
  closeFactory: () => void;
  closeNetwork: () => void;

  newFactoryOpen: boolean;
  openNewFactory: () => void;
  closeNewFactory: () => void;
  newNetworkOpen: boolean;
  openNewNetwork: () => void;
  closeNewNetwork: () => void;

  selectedFundraisingId: string | null;
  openFundraising: (id: string) => void;
  closeFundraising: () => void;
  newFundraisingTrack: FundraisingTrack | null;
  openNewFundraising: (track: FundraisingTrack) => void;
  closeNewFundraising: () => void;

  reload: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

// Context items are polymorphic (no FK cascade), so purge them + their storage
// objects when the owning entity is deleted. No-ops gracefully if the table isn't there.
async function purgeEntityContext(entityType: "factory" | "network", id: string) {
  const sb = supabase();
  const { data: items } = await sb
    .from("context_items")
    .select("storage_path,kind")
    .eq("entity_type", entityType)
    .eq("entity_id", id);
  const paths = (items ?? [])
    .filter((i) => i.kind === "file" && i.storage_path)
    .map((i) => i.storage_path as string);
  if (paths.length) await sb.storage.from("context-files").remove(paths);
  await sb.from("context_items").delete().eq("entity_type", entityType).eq("entity_id", id);
}

export function FactoriesProvider({ children }: { children: React.ReactNode }) {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [networks, setNetworks] = useState<Network[] | null>(null);
  const [factories, setFactories] = useState<Factory[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [fundraisingLeads, setFundraisingLeads] = useState<FundraisingLead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [newFactoryOpen, setNewFactoryOpen] = useState(false);
  const [newNetworkOpen, setNewNetworkOpen] = useState(false);
  const [selectedFundraisingId, setSelectedFundraisingId] = useState<string | null>(null);
  const [newFundraisingTrack, setNewFundraisingTrack] = useState<FundraisingTrack | null>(null);

  const reload = useCallback(async () => {
    const sb = supabase();
    const [v, nw, f, c, a, n, inv, comp] = await Promise.all([
      sb.from("verticals").select("*").order("sort"),
      sb.from("networks").select("*").order("created_at", { ascending: false }),
      sb.from("factories").select("*").order("created_at", { ascending: false }),
      sb.from("contacts").select("*").order("created_at", { ascending: false }),
      sb.from("activities").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("notifications").select("*").order("created_at", { ascending: false }),
      sb.from("investors").select("*").order("created_at", { ascending: false }),
      sb.from("competitions").select("*").order("created_at", { ascending: false }),
    ]);
    if (v.data) setVerticals(v.data as Vertical[]);
    setNetworks((nw.data ?? []) as Network[]);
    if (f.error) setError(f.error.message);
    else setFactories((f.data ?? []) as Factory[]);
    setContacts((c.data ?? []) as Contact[]);
    setActivities((a.data ?? []) as Activity[]);
    setNotifications((n.data ?? []) as Notification[]);
    // Tolerate a missing fundraising migration: fall back to empty lists so the
    // rest of the app still loads. Each row is tagged with its track discriminator.
    setFundraisingLeads([
      ...(inv.error ? [] : (inv.data ?? [])).map((r) => ({ ...r, track: "investor" as FundraisingTrack })),
      ...(comp.error ? [] : (comp.data ?? [])).map((r) => ({ ...r, track: "competition" as FundraisingTrack })),
    ] as FundraisingLead[]);
  }, []);

  useEffect(() => {
    const sb = supabase();
    let mounted = true;
    reload();

    const applyRealtime = <T extends { id: string }>(
      setter: React.Dispatch<React.SetStateAction<T[] | null>>,
    ) =>
      (payload: {
        eventType: string;
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      }) => {
        if (!mounted) return;
        setter((prev) => {
          if (!prev) return prev;
          const row = (payload.new ?? payload.old) as T;
          if (payload.eventType === "INSERT")
            return prev.some((r) => r.id === row.id) ? prev : [row, ...prev];
          if (payload.eventType === "UPDATE")
            // Realtime UPDATE payloads can omit unchanged TOAST-backed fields
            // (notably long description/notes text). Merge the changed fields
            // instead of replacing the complete client-side record.
            return prev.map((r) => (r.id === row.id ? { ...r, ...row } : r));
          if (payload.eventType === "DELETE")
            return prev.filter((r) => r.id !== row.id);
          return prev;
        });
      };

    // Fundraising realtime: the source table isn't a row column, so re-tag the
    // `track` discriminator onto each incoming payload before merging.
    const applyFundraisingRealtime =
      (track: FundraisingTrack) =>
      (payload: {
        eventType: string;
        new: Record<string, unknown>;
        old: Record<string, unknown>;
      }) => {
        if (!mounted) return;
        setFundraisingLeads((prev) => {
          if (!prev) return prev;
          const row = { ...(payload.new ?? payload.old), track } as FundraisingLead;
          if (payload.eventType === "INSERT")
            return prev.some((r) => r.id === row.id) ? prev : [row, ...prev];
          if (payload.eventType === "UPDATE")
            return prev.map((r) => (r.id === row.id ? { ...r, ...row } : r));
          if (payload.eventType === "DELETE")
            return prev.filter((r) => r.id !== row.id);
          return prev;
        });
      };

    const channel = sb
      .channel("dp-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "networks" }, applyRealtime<Network>(setNetworks))
      .on("postgres_changes", { event: "*", schema: "public", table: "factories" }, applyRealtime<Factory>(setFactories))
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, applyRealtime<Contact>(setContacts))
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, applyRealtime<Activity>(setActivities))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, applyRealtime<Notification>(setNotifications))
      .on("postgres_changes", { event: "*", schema: "public", table: "investors" }, applyFundraisingRealtime("investor"))
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, applyFundraisingRealtime("competition"))
      .subscribe();

    return () => {
      mounted = false;
      sb.removeChannel(channel);
    };
  }, [reload]);

  const updateFactory = useCallback(async (id: string, patch: Partial<Factory>) => {
    setFactories((prev) => (prev ? prev.map((f) => (f.id === id ? { ...f, ...patch } : f)) : prev));
    const { data, error } = await supabase()
      .from("factories")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      setError(error.message);
      await reload();
      return;
    }
    if (data) {
      const saved = data as Factory;
      setFactories((prev) => (prev
        ? prev.map((factory) => (factory.id === id ? { ...factory, ...saved } : factory))
        : prev));
    }
  }, [reload]);

  const deleteFactory = useCallback(async (id: string) => {
    setFactories((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
    setSelectedFactoryId((cur) => (cur === id ? null : cur));
    await purgeEntityContext("factory", id);
    const { error } = await supabase().from("factories").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const updateNetwork = useCallback(async (id: string, patch: Partial<Network>) => {
    setNetworks((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, ...patch } : n)) : prev));
    const { error } = await supabase().from("networks").update(patch).eq("id", id);
    if (error) setError(error.message);
  }, []);

  const deleteNetwork = useCallback(async (id: string) => {
    setNetworks((prev) => (prev ? prev.filter((n) => n.id !== id) : prev));
    setSelectedNetworkId((cur) => (cur === id ? null : cur));
    await purgeEntityContext("network", id);
    const { error } = await supabase().from("networks").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const updateContact = useCallback(async (id: string, patch: Partial<Contact>) => {
    const now = new Date().toISOString();
    const currentContact = contacts?.find((contact) => contact.id === id);
    const factoryId = patch.stage !== undefined
      ? currentContact?.factory_id ?? null
      : null;
    const rolledStage = factoryId && contacts
      ? highestStage(
          contacts
            .filter((contact) => contact.factory_id === factoryId)
            .map((contact) => contact.id === id
              ? (patch.stage ?? contact.stage)
              : contact.stage),
        )
      : null;

    // When a contact's stage moves, roll the parent factory up to the highest
    // stage across its contacts (instant UI mirror of the DB trigger).
    setContacts((prev) => (prev
      ? prev.map((contact) => (contact.id === id ? { ...contact, ...patch } : contact))
      : prev));
    if (factoryId && rolledStage) {
      setFactories((prev) =>
        prev
          ? prev.map((f) =>
              f.id === factoryId
                ? { ...f, stage: rolledStage!, stage_locked: false, last_activity_at: now }
                : f,
            )
          : prev,
      );
    }
    const sb = supabase();
    if (factoryId) {
      const unlockResult = await sb
        .from("factories")
        .update({ stage_locked: false })
        .eq("id", factoryId);
      if (unlockResult.error) {
        setError(unlockResult.error.message);
        await reload();
        return;
      }
    }
    const contactResult = await sb.from("contacts").update(patch).eq("id", id);
    if (contactResult.error) {
      setError(contactResult.error.message);
      await reload();
    }
  }, [contacts, reload]);

  const deleteContact = useCallback(async (id: string) => {
    setContacts((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    setSelectedContactId((current) => (current === id ? null : current));
    const { error } = await supabase().from("contacts").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  // Change a contact's stage (factory roll-up handled inside updateContact).
  const setContactStage = useCallback(
    async (id: string, stage: Stage) => {
      await updateContact(id, { stage, last_activity_at: new Date().toISOString() });
    },
    [updateContact],
  );

  // Change only the factory stage. The database records one factory-level
  // activity and deliberately leaves each contact's individual stage intact.
  const setFactoryStage = useCallback(async (factoryId: string, stage: Stage) => {
    const now = new Date().toISOString();
    setFactories((prev) =>
      prev
        ? prev.map((f) =>
            f.id === factoryId
              ? { ...f, stage, stage_locked: false, last_activity_at: now }
              : f,
          )
        : prev,
    );
    const sb = supabase();
    const factoryResult = await sb
      .from("factories")
      .update({ stage, stage_locked: false, last_activity_at: now })
      .eq("id", factoryId);
    if (factoryResult.error) {
      setError(factoryResult.error.message);
      await reload();
      return;
    }
  }, [reload]);

  const addContact = useCallback(async (factoryId: string, patch: Partial<Contact>) => {
    const { error } = await supabase()
      .from("contacts")
      .insert({ factory_id: factoryId, full_name: "New contact", ...patch });
    if (error) setError(error.message);
  }, []);

  const addNetworkContact = useCallback(async (networkId: string, patch: Partial<Contact>) => {
    const { error } = await supabase()
      .from("contacts")
      .insert({ network_id: networkId, factory_id: null, full_name: "New contact", ...patch });
    if (error) setError(error.message);
  }, []);

  const addActivity = useCallback(async (factoryId: string, patch: Partial<Activity>) => {
    const { error } = await supabase()
      .from("activities")
      .insert({ factory_id: factoryId, type: "note", ...patch });
    if (error) setError(error.message);
  }, []);

  const addNetworkActivity = useCallback(async (networkId: string, patch: Partial<Activity>) => {
    const { error } = await supabase()
      .from("activities")
      .insert({ network_id: networkId, factory_id: null, type: "note", ...patch });
    if (error) setError(error.message);
  }, []);

  const deleteActivity = useCallback(async (id: string) => {
    setActivities((prev) => (prev ? prev.filter((activity) => activity.id !== id) : prev));
    const { error } = await supabase().from("activities").delete().eq("id", id);
    if (error) {
      setError(error.message);
      await reload();
    }
  }, [reload]);

  const markNotificationRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)) : prev));
    await supabase().from("notifications").update({ read_at: readAt }).eq("id", id);
  }, []);

  // ── Fundraising CRUD (dispatches to investors / competitions by track) ──────
  const createFundraisingLead = useCallback(
    async (track: FundraisingTrack, patch: Partial<FundraisingLead>) => {
      const table = FUNDRAISING_TRACKS.find((t) => t.key === track)!.table;
      // `track` is a client-side discriminator, never a DB column.
      const { track: _omit, ...row } = { track, ...patch };
      const { data, error } = await supabase().from(table).insert(row).select().single();
      if (error) {
        setError(error.message);
        return null;
      }
      const saved = { ...(data as FundraisingLead), track };
      setFundraisingLeads((prev) => (prev ? [saved, ...prev.filter((l) => l.id !== saved.id)] : [saved]));
      return saved;
    },
    [],
  );

  const updateFundraisingLead = useCallback(
    async (track: FundraisingTrack, id: string, patch: Partial<FundraisingLead>) => {
      const table = FUNDRAISING_TRACKS.find((t) => t.key === track)!.table;
      setFundraisingLeads((prev) => (prev ? prev.map((l) => (l.id === id ? { ...l, ...patch } : l)) : prev));
      const { track: _omit, ...dbPatch } = patch;
      const { error } = await supabase().from(table).update(dbPatch).eq("id", id);
      if (error) {
        setError(error.message);
        await reload();
      }
    },
    [reload],
  );

  const addFundraisingActivity = useCallback(
    async (track: FundraisingTrack, id: string, patch: Partial<Activity>) => {
      const column = track === "investor" ? "investor_id" : "competition_id";
      const { error } = await supabase()
        .from("activities")
        .insert({ [column]: id, type: "note", ...patch });
      if (error) setError(error.message);
      // Logging activity keeps the lead's stale timer fresh.
      await updateFundraisingLead(track, id, { last_activity_at: new Date().toISOString() });
    },
    [updateFundraisingLead],
  );

  const deleteFundraisingLead = useCallback(async (track: FundraisingTrack, id: string) => {
    const table = FUNDRAISING_TRACKS.find((t) => t.key === track)!.table;
    setFundraisingLeads((prev) => (prev ? prev.filter((l) => l.id !== id) : prev));
    setSelectedFundraisingId((cur) => (cur === id ? null : cur));
    const { error } = await supabase().from(table).delete().eq("id", id);
    if (error) {
      setError(error.message);
      await reload();
    }
  }, [reload]);

  const value: Ctx = {
    verticals,
    networks,
    factories,
    contacts,
    activities,
    notifications,
    fundraisingLeads,
    error,
    factory: (id) => factories?.find((f) => f.id === id) ?? null,
    network: (id) => networks?.find((n) => n.id === id) ?? null,
    contactsOf: (factoryId) => (contacts ?? []).filter((c) => c.factory_id === factoryId),
    contactsOfNetwork: (networkId) => (contacts ?? []).filter((c) => c.network_id === networkId),
    factoriesOfNetwork: (networkId) => (factories ?? []).filter((f) => f.network_id === networkId),
    activitiesOf: (factoryId) => {
      const factoryStage = factories?.find((factory) => factory.id === factoryId)?.stage ?? "New";
      return visibleFactoryActivities(
        (activities ?? []).filter((activity) => activity.factory_id === factoryId),
        factoryStage,
      );
    },
    activitiesOfNetwork: (networkId) => (activities ?? []).filter((activity) => activity.network_id === networkId),
    verticalName: (id) => verticals.find((v) => v.id === id)?.name ?? "—",
    networkName: (id) => networks?.find((n) => n.id === id)?.name ?? "—",
    updateFactory,
    deleteFactory,
    updateNetwork,
    deleteNetwork,
    updateContact,
    deleteContact,
    setContactStage,
    setFactoryStage,
    addContact,
    addNetworkContact,
    addActivity,
    addNetworkActivity,
    deleteActivity,
    markNotificationRead,
    fundraisingLead: (id) => fundraisingLeads?.find((l) => l.id === id) ?? null,
    activitiesOfFundraising: (track, id) => {
      const column = track === "investor" ? "investor_id" : "competition_id";
      return (activities ?? []).filter((a) => (a as Activity)[column as "investor_id" | "competition_id"] === id);
    },
    addFundraisingActivity,
    createFundraisingLead,
    updateFundraisingLead,
    deleteFundraisingLead,
    selectedFactoryId,
    selectedContactId,
    selectedNetworkId,
    openFactory: (id) => {
      setSelectedNetworkId(null);
      setSelectedContactId(null);
      setSelectedFactoryId(id);
    },
    openContact: (id) => {
      const contact = contacts?.find((c) => c.id === id);
      if (!contact) return;
      if (contact.factory_id) {
        setSelectedNetworkId(null);
        setSelectedContactId(id);
        setSelectedFactoryId(contact.factory_id);
      } else if (contact.network_id) {
        setSelectedFactoryId(null);
        setSelectedContactId(null);
        setSelectedNetworkId(contact.network_id);
      }
    },
    openNetwork: (id) => {
      setSelectedFactoryId(null);
      setSelectedContactId(null);
      setSelectedNetworkId(id);
    },
    closeFactory: () => {
      setSelectedFactoryId(null);
      setSelectedContactId(null);
    },
    closeNetwork: () => setSelectedNetworkId(null),
    newFactoryOpen,
    openNewFactory: () => setNewFactoryOpen(true),
    closeNewFactory: () => setNewFactoryOpen(false),
    newNetworkOpen,
    openNewNetwork: () => setNewNetworkOpen(true),
    closeNewNetwork: () => setNewNetworkOpen(false),
    selectedFundraisingId,
    openFundraising: (id) => setSelectedFundraisingId(id),
    closeFundraising: () => setSelectedFundraisingId(null),
    newFundraisingTrack,
    openNewFundraising: (track) => setNewFundraisingTrack(track),
    closeNewFundraising: () => setNewFundraisingTrack(null),
    reload,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within FactoriesProvider");
  return ctx;
}
