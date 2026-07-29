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
  Network,
  Notification,
  Stage,
  Vertical,
} from "@/lib/types";
import { highestStage } from "@/lib/stage";
import { supabase } from "@/lib/supabase";

type Ctx = {
  verticals: Vertical[];
  networks: Network[] | null;
  factories: Factory[] | null;
  contacts: Contact[] | null;
  activities: Activity[] | null;
  notifications: Notification[] | null;
  error: string | null;

  factory: (id: string | null) => Factory | null;
  network: (id: string | null) => Network | null;
  contactsOf: (factoryId: string) => Contact[];
  contactsOfNetwork: (networkId: string) => Contact[];
  factoriesOfNetwork: (networkId: string) => Factory[];
  activitiesOf: (factoryId: string) => Activity[];
  verticalName: (id: string | null) => string;
  networkName: (id: string | null) => string;

  updateFactory: (id: string, patch: Partial<Factory>) => Promise<void>;
  deleteFactory: (id: string) => Promise<void>;
  updateNetwork: (id: string, patch: Partial<Network>) => Promise<void>;
  deleteNetwork: (id: string) => Promise<void>;
  updateContact: (id: string, patch: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  // Stage sync: keep a factory's stage in step with its contacts' highest stage.
  setContactStage: (id: string, stage: Stage) => Promise<void>;
  setFactoryStage: (factoryId: string, stage: Stage) => Promise<void>;
  addContact: (factoryId: string, patch: Partial<Contact>) => Promise<void>;
  addNetworkContact: (networkId: string, patch: Partial<Contact>) => Promise<void>;
  addActivity: (factoryId: string, patch: Partial<Activity>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

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
  const [error, setError] = useState<string | null>(null);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [newFactoryOpen, setNewFactoryOpen] = useState(false);
  const [newNetworkOpen, setNewNetworkOpen] = useState(false);

  const reload = useCallback(async () => {
    const sb = supabase();
    const [v, nw, f, c, a, n] = await Promise.all([
      sb.from("verticals").select("*").order("sort"),
      sb.from("networks").select("*").order("created_at", { ascending: false }),
      sb.from("factories").select("*").order("created_at", { ascending: false }),
      sb.from("contacts").select("*").order("created_at", { ascending: false }),
      sb.from("activities").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);
    if (v.data) setVerticals(v.data as Vertical[]);
    setNetworks((nw.data ?? []) as Network[]);
    if (f.error) setError(f.error.message);
    else setFactories((f.data ?? []) as Factory[]);
    setContacts((c.data ?? []) as Contact[]);
    setActivities((a.data ?? []) as Activity[]);
    setNotifications((n.data ?? []) as Notification[]);
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

    const channel = sb
      .channel("dp-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "networks" }, applyRealtime<Network>(setNetworks))
      .on("postgres_changes", { event: "*", schema: "public", table: "factories" }, applyRealtime<Factory>(setFactories))
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, applyRealtime<Contact>(setContacts))
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, applyRealtime<Activity>(setActivities))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, applyRealtime<Notification>(setNotifications))
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

  // Change a factory's stage and push it down to every contact so the two stay
  // in sync (the highest contact stage then equals the factory stage).
  const setFactoryStage = useCallback(async (factoryId: string, stage: Stage) => {
    const now = new Date().toISOString();
    const hasContacts = contacts?.some((contact) => contact.factory_id === factoryId) ?? false;
    setContacts((prev) => (prev
      ? prev.map((c) =>
        c.factory_id === factoryId ? { ...c, stage, last_activity_at: now } : c,
      )
      : prev));
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
    // The migration propagates direct factory-stage edits. Keep this explicit
    // update for databases that have not installed that trigger yet.
    if (hasContacts) {
      const contactsResult = await sb
        .from("contacts")
        .update({ stage, last_activity_at: now })
        .eq("factory_id", factoryId);
      if (contactsResult.error) {
        setError(contactsResult.error.message);
        await reload();
      }
    }
  }, [contacts, reload]);

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

  const markNotificationRead = useCallback(async (id: string) => {
    const readAt = new Date().toISOString();
    setNotifications((prev) => (prev ? prev.map((n) => (n.id === id ? { ...n, read_at: readAt } : n)) : prev));
    await supabase().from("notifications").update({ read_at: readAt }).eq("id", id);
  }, []);

  const value: Ctx = {
    verticals,
    networks,
    factories,
    contacts,
    activities,
    notifications,
    error,
    factory: (id) => factories?.find((f) => f.id === id) ?? null,
    network: (id) => networks?.find((n) => n.id === id) ?? null,
    contactsOf: (factoryId) => (contacts ?? []).filter((c) => c.factory_id === factoryId),
    contactsOfNetwork: (networkId) => (contacts ?? []).filter((c) => c.network_id === networkId),
    factoriesOfNetwork: (networkId) => (factories ?? []).filter((f) => f.network_id === networkId),
    activitiesOf: (factoryId) => (activities ?? []).filter((a) => a.factory_id === factoryId),
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
    markNotificationRead,
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
    reload,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within FactoriesProvider");
  return ctx;
}
