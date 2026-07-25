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
  Notification,
  Vertical,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";

type Ctx = {
  verticals: Vertical[];
  factories: Factory[] | null;
  contacts: Contact[] | null;
  activities: Activity[] | null;
  notifications: Notification[] | null;
  error: string | null;

  factory: (id: string | null) => Factory | null;
  contactsOf: (factoryId: string) => Contact[];
  activitiesOf: (factoryId: string) => Activity[];
  verticalName: (id: string | null) => string;

  updateFactory: (id: string, patch: Partial<Factory>) => Promise<void>;
  deleteFactory: (id: string) => Promise<void>;
  updateContact: (id: string, patch: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addContact: (factoryId: string, patch: Partial<Contact>) => Promise<void>;
  addActivity: (factoryId: string, patch: Partial<Activity>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;

  selectedFactoryId: string | null;
  selectedContactId: string | null;
  openFactory: (id: string) => void;
  openContact: (id: string) => void;
  closeFactory: () => void;
  newFactoryOpen: boolean;
  openNewFactory: () => void;
  closeNewFactory: () => void;

  reload: () => Promise<void>;
};

const StoreContext = createContext<Ctx | null>(null);

export function FactoriesProvider({ children }: { children: React.ReactNode }) {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [factories, setFactories] = useState<Factory[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newFactoryOpen, setNewFactoryOpen] = useState(false);

  const reload = useCallback(async () => {
    const sb = supabase();
    const [v, f, c, a, n] = await Promise.all([
      sb.from("verticals").select("*").order("sort"),
      sb.from("factories").select("*").order("created_at", { ascending: false }),
      sb.from("contacts").select("*").order("created_at", { ascending: false }),
      sb.from("activities").select("*").order("created_at", { ascending: false }).limit(1000),
      sb.from("notifications").select("*").order("created_at", { ascending: false }),
    ]);
    if (v.data) setVerticals(v.data as Vertical[]);
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
            return prev.map((r) => (r.id === row.id ? row : r));
          if (payload.eventType === "DELETE")
            return prev.filter((r) => r.id !== row.id);
          return prev;
        });
      };

    const channel = sb
      .channel("dp-realtime")
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
    const { error } = await supabase().from("factories").update(patch).eq("id", id);
    if (error) setError(error.message);
  }, []);

  const deleteFactory = useCallback(async (id: string) => {
    setFactories((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
    setSelectedFactoryId((cur) => (cur === id ? null : cur));
    const { error } = await supabase().from("factories").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const updateContact = useCallback(async (id: string, patch: Partial<Contact>) => {
    setContacts((prev) => (prev ? prev.map((c) => (c.id === id ? { ...c, ...patch } : c)) : prev));
    const { error } = await supabase().from("contacts").update(patch).eq("id", id);
    if (error) setError(error.message);
  }, []);

  const deleteContact = useCallback(async (id: string) => {
    setContacts((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    setSelectedContactId((current) => (current === id ? null : current));
    const { error } = await supabase().from("contacts").delete().eq("id", id);
    if (error) setError(error.message);
  }, []);

  const addContact = useCallback(async (factoryId: string, patch: Partial<Contact>) => {
    const { error } = await supabase()
      .from("contacts")
      .insert({ factory_id: factoryId, full_name: "New contact", ...patch });
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
    factories,
    contacts,
    activities,
    notifications,
    error,
    factory: (id) => factories?.find((f) => f.id === id) ?? null,
    contactsOf: (factoryId) => (contacts ?? []).filter((c) => c.factory_id === factoryId),
    activitiesOf: (factoryId) => (activities ?? []).filter((a) => a.factory_id === factoryId),
    verticalName: (id) => verticals.find((v) => v.id === id)?.name ?? "—",
    updateFactory,
    deleteFactory,
    updateContact,
    deleteContact,
    addContact,
    addActivity,
    markNotificationRead,
    selectedFactoryId,
    selectedContactId,
    openFactory: (id) => {
      setSelectedContactId(null);
      setSelectedFactoryId(id);
    },
    openContact: (id) => {
      const contact = contacts?.find((c) => c.id === id);
      if (!contact) return;
      setSelectedContactId(id);
      setSelectedFactoryId(contact.factory_id);
    },
    closeFactory: () => {
      setSelectedFactoryId(null);
      setSelectedContactId(null);
    },
    newFactoryOpen,
    openNewFactory: () => setNewFactoryOpen(true),
    closeNewFactory: () => setNewFactoryOpen(false),
    reload,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within FactoriesProvider");
  return ctx;
}
