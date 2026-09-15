// ── To-do attachments (Supabase Storage) ────────────────────────────────────
//
// Private bucket, signed-URL downloads — the same shape as `context-files` in
// context-panel.tsx. `storage_path` is bucket-relative, so the same column
// addresses a real S3 bucket unchanged if the backend is ever swapped; only
// the three calls in here would need presigned-URL routes behind them.

import { supabase } from "./supabase";
import type { TodoAttachment } from "./todo-types";

export const TODO_BUCKET = "todo-files";

/** Matches the bucket's own file_size_limit, so the guard and the server agree. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

function sanitise(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "file";
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function isImage(mime: string | null): boolean {
  return !!mime && mime.startsWith("image/");
}

/**
 * Upload one file and record it.
 *
 * The storage write happens first and is rolled back if the row insert fails.
 * That ordering is deliberate: an orphaned object is invisible, whereas a row
 * pointing at a missing object is a permanently broken UI element.
 */
export async function uploadTodoFile(
  todoId: string,
  file: File,
): Promise<{ attachment: TodoAttachment | null; error: string | null }> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      attachment: null,
      error: `${file.name} is larger than ${formatBytes(MAX_ATTACHMENT_BYTES)}`,
    };
  }

  const sb = supabase();
  const path = `todos/${todoId}/${crypto.randomUUID()}-${sanitise(file.name)}`;

  const { error: uploadError } = await sb.storage
    .from(TODO_BUCKET)
    .upload(path, file, { upsert: false });
  if (uploadError) return { attachment: null, error: uploadError.message };

  const { data, error: insertError } = await sb
    .from("todo_attachments")
    .insert({
      todo_id: todoId,
      file_name: file.name,
      mime_type: file.type || null,
      byte_size: file.size,
      storage_path: path,
    })
    .select("*")
    .single();

  if (insertError) {
    await sb.storage.from(TODO_BUCKET).remove([path]);
    return { attachment: null, error: insertError.message };
  }

  return { attachment: data as TodoAttachment, error: null };
}

/** A short-lived URL. `download` forces the save dialog rather than inline view. */
export async function signedUrl(
  path: string,
  seconds: number,
  downloadAs?: string,
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase()
    .storage.from(TODO_BUCKET)
    .createSignedUrl(path, seconds, downloadAs ? { download: downloadAs } : undefined);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
}

/** Remove the object first, then the row — a row without its object is the bad state. */
export async function deleteTodoFile(attachment: TodoAttachment): Promise<string | null> {
  const sb = supabase();
  const { error: storageError } = await sb.storage
    .from(TODO_BUCKET)
    .remove([attachment.storage_path]);
  const { error: rowError } = await sb
    .from("todo_attachments")
    .delete()
    .eq("id", attachment.id);
  return rowError?.message ?? storageError?.message ?? null;
}

/**
 * Delete a task and sweep its attachments out of storage.
 *
 * `on delete cascade` removes the attachment ROWS but storage knows nothing
 * about foreign keys, so a plain delete would leak every object.
 */
export async function deleteTodoWithFiles(todoId: string): Promise<string | null> {
  const sb = supabase();

  const { data: attachments } = await sb
    .from("todo_attachments")
    .select("storage_path")
    .eq("todo_id", todoId);

  const paths = ((attachments ?? []) as { storage_path: string }[]).map((a) => a.storage_path);
  if (paths.length) await sb.storage.from(TODO_BUCKET).remove(paths);

  const { error } = await sb.from("todos").delete().eq("id", todoId);
  return error?.message ?? null;
}
