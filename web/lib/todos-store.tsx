"use client";

// ── To-do store ─────────────────────────────────────────────────────────────
//
// Scoped to the /todos route rather than mounted in AppShell: factories-store
// is global because the sidebar counts need it on every page, but todos are
// needed on one route and the rest of the platform should not pay to load them.
//
// The realtime + optimistic-write shape is the one work-inventory.tsx already
// uses: patch local state immediately, and on any write error surface it and
// reload from the server rather than leaving the optimistic state standing.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { supabase } from "./supabase";
import { deleteTodoWithFiles } from "./todo-files";
import { nextOrder } from "./todo-order";
import {
  isFinished,
  statusPatch,
  toIsoDate,
  type Todo,
  type TodoProject,
} from "./todo-types";

/** The columns the app reads. The table carries a few it no longer uses. */
const TODO_COLUMNS =
  "id,project_id,title,notes,status,priority,due_on,link,completed_at,sort_order,owner_id,assignee_id,created_at,updated_at";

type Ctx = {
  /** `null` while the first load is in flight. */
  todos: Todo[] | null;
  projects: TodoProject[] | null;
  error: string | null;
  /** `YYYY-MM-DD`, recomputed on focus so it survives a tab left open overnight. */
  today: string;

  createTodo: (input: NewTodoInput) => Promise<Todo | null>;
  updateTodo: (id: string, patch: Partial<Todo>) => Promise<void>;
  setStatus: (todo: Todo, status: Todo["status"]) => Promise<void>;
  toggleComplete: (todo: Todo) => Promise<void>;
  deleteTodo: (todo: Todo) => Promise<void>;
  moveTodo: (id: string, sortOrder: number) => Promise<void>;

  createProject: (name: string, color?: string) => Promise<TodoProject | null>;
  updateProject: (id: string, patch: Partial<TodoProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
};

export type NewTodoInput = {
  title: string;
  notes: string | null;
  due_on: string | null;
  priority: Todo["priority"];
  link: string | null;
  project_id: string | null;
  status: Todo["status"];
};

const TodosContext = createContext<Ctx | null>(null);

export function TodosProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [projects, setProjects] = useState<TodoProject[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toIsoDate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toIsoDate(new Date()));
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, []);

  const load = useCallback(async () => {
    const sb = supabase();
    const [todoRes, projectRes] = await Promise.all([
      sb.from("todos").select(TODO_COLUMNS).order("sort_order", { ascending: true }),
      sb.from("todo_projects").select("*").order("sort_order", { ascending: true }),
    ]);

    const failure = todoRes.error ?? projectRes.error;
    if (failure) {
      setError(failure.message);
      setTodos([]);
      setProjects([]);
      return;
    }

    setError(null);
    setTodos((todoRes.data ?? []) as unknown as Todo[]);
    setProjects((projectRes.data ?? []) as TodoProject[]);
  }, []);

  // Keep `load` addressable from callbacks without making it a dependency of
  // every one of them.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    load();
    const sb = supabase();

    function subscribe<T extends { id: string }>(
      table: string,
      setter: React.Dispatch<React.SetStateAction<T[] | null>>,
    ) {
      return sb
        .channel(`todos-${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          const row = (payload.new ?? payload.old) as T;
          setter((current) => {
            if (!current) return current;
            if (payload.eventType === "INSERT") {
              return current.some((item) => item.id === row.id) ? current : [...current, row];
            }
            if (payload.eventType === "UPDATE") {
              return current.map((item) => (item.id === row.id ? { ...item, ...row } : item));
            }
            if (payload.eventType === "DELETE") {
              return current.filter((item) => item.id !== row.id);
            }
            return current;
          });
        })
        .subscribe();
    }

    const channels = [
      subscribe<Todo>("todos", setTodos),
      subscribe<TodoProject>("todo_projects", setProjects),
    ];

    return () => {
      for (const channel of channels) sb.removeChannel(channel);
    };
  }, [load]);

  /** Report a failed write and resync, so the optimistic state cannot stick. */
  const fail = useCallback(async (message: string) => {
    setError(message);
    toast.error(message);
    await loadRef.current();
  }, []);

  const createTodo = useCallback<Ctx["createTodo"]>(
    async (input) => {
      const siblings = (todos ?? []).filter((t) => t.project_id === input.project_id);
      const { data, error: insertError } = await supabase()
        .from("todos")
        .insert({
          project_id: input.project_id,
          title: input.title,
          notes: input.notes,
          priority: input.priority,
          // A task with no date would live nowhere but its project, since the
          // other views are date-driven — so it lands on today by default.
          due_on: input.due_on ?? toIsoDate(new Date()),
          link: input.link,
          ...statusPatch(input.status),
          sort_order: nextOrder(siblings.map((t) => t.sort_order)),
        })
        .select(TODO_COLUMNS)
        .single();

      if (insertError) {
        await fail(insertError.message);
        return null;
      }
      const created = data as unknown as Todo;
      setTodos((current) =>
        current?.some((t) => t.id === created.id) ? current : [...(current ?? []), created],
      );
      return created;
    },
    [todos, fail],
  );

  const updateTodo = useCallback<Ctx["updateTodo"]>(
    async (id, patch) => {
      setTodos((current) => current?.map((t) => (t.id === id ? { ...t, ...patch } : t)) ?? current);
      const { error: updateError } = await supabase().from("todos").update(patch).eq("id", id);
      if (updateError) await fail(updateError.message);
    },
    [fail],
  );

  /** Move a task between the board's columns. */
  const setStatus = useCallback<Ctx["setStatus"]>(
    async (todo, status) => {
      if (todo.status === status) return;
      await updateTodo(todo.id, statusPatch(status));
    },
    [updateTodo],
  );

  const toggleComplete = useCallback<Ctx["toggleComplete"]>(
    async (todo) => {
      if (isFinished(todo.status)) {
        await setStatus(todo, "open");
        return;
      }
      await setStatus(todo, "done");
      // Undo commits immediately rather than deferring the write: a deferred
      // one is lost if the tab closes before the toast expires.
      toast.success("Completed", {
        action: {
          label: "Undo",
          onClick: () => {
            // Back to where it was — a pending task returns to pending.
            void updateTodo(todo.id, statusPatch(todo.status));
          },
        },
      });
    },
    [setStatus, updateTodo],
  );

  const deleteTodo = useCallback<Ctx["deleteTodo"]>(
    async (todo) => {
      setTodos((current) => current?.filter((t) => t.id !== todo.id) ?? current);
      // Sweeps storage as well as rows — the cascade does not reach objects.
      const message = await deleteTodoWithFiles(todo.id);
      if (message) return fail(message);
      toast.success(`Deleted “${todo.title}”`);
    },
    [fail],
  );

  const moveTodo = useCallback<Ctx["moveTodo"]>(
    async (id, sortOrder) => {
      await updateTodo(id, { sort_order: sortOrder });
    },
    [updateTodo],
  );

  const createProject = useCallback<Ctx["createProject"]>(
    async (name, color = "primary") => {
      const { data, error: insertError } = await supabase()
        .from("todo_projects")
        .insert({
          name,
          color,
          sort_order: nextOrder((projects ?? []).map((p) => p.sort_order)),
        })
        .select("*")
        .single();
      if (insertError) {
        await fail(insertError.message);
        return null;
      }
      const created = data as TodoProject;
      setProjects((current) =>
        current?.some((p) => p.id === created.id) ? current : [...(current ?? []), created],
      );
      return created;
    },
    [projects, fail],
  );

  const updateProject = useCallback<Ctx["updateProject"]>(
    async (id, patch) => {
      setProjects((current) => current?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? current);
      const { error: updateError } = await supabase()
        .from("todo_projects")
        .update(patch)
        .eq("id", id);
      if (updateError) await fail(updateError.message);
    },
    [fail],
  );

  const deleteProject = useCallback<Ctx["deleteProject"]>(
    async (id) => {
      // The project's tasks cascade, so their attachments have to be swept
      // first — same reasoning as deleteTodoWithFiles.
      for (const todo of (todos ?? []).filter((t) => t.project_id === id)) {
        await deleteTodoWithFiles(todo.id);
      }

      setProjects((current) => current?.filter((p) => p.id !== id) ?? current);
      setTodos((current) => current?.filter((t) => t.project_id !== id) ?? current);
      const { error: deleteError } = await supabase().from("todo_projects").delete().eq("id", id);
      if (deleteError) await fail(deleteError.message);
    },
    [todos, fail],
  );

  const value = useMemo<Ctx>(
    () => ({
      todos, projects, error, today,
      createTodo, updateTodo, setStatus, toggleComplete, deleteTodo, moveTodo,
      createProject, updateProject, deleteProject,
    }),
    [
      todos, projects, error, today,
      createTodo, updateTodo, setStatus, toggleComplete, deleteTodo, moveTodo,
      createProject, updateProject, deleteProject,
    ],
  );

  return <TodosContext.Provider value={value}>{children}</TodosContext.Provider>;
}

export function useTodos(): Ctx {
  const ctx = useContext(TodosContext);
  if (!ctx) throw new Error("useTodos must be used inside <TodosProvider>");
  return ctx;
}

/**
 * The sidebar's "due today + overdue" badge.
 *
 * A deliberately separate, cheap `count` query rather than a second global
 * store: the whole point of scoping TodosProvider to /todos is that the other
 * routes do not load todos. This runs one HEAD count on mount and whenever the
 * tab regains focus, which is as fresh as a nav badge needs to be.
 */
export function useTodoDueCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function read() {
      const { count: rows } = await supabase()
        .from("todos")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "pending"])
        .lte("due_on", toIsoDate(new Date()));
      if (!cancelled) setCount(rows ?? 0);
    }

    void read();
    window.addEventListener("focus", read);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", read);
    };
  }, []);

  return count;
}
