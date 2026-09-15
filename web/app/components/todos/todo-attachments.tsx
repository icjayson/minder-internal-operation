"use client";

// Attachments live in the private `todo-files` bucket; every read goes through
// a short-lived signed URL, the same way context-panel.tsx reads `context-files`.

import { useCallback, useEffect, useState } from "react";
import { DownloadIcon, PaperclipIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/design-system/components/button";
import { Spinner } from "@/design-system/components/spinner";
import { supabase } from "@/lib/supabase";
import {
  deleteTodoFile,
  formatBytes,
  isImage,
  signedUrl,
  uploadTodoFile,
} from "@/lib/todo-files";
import type { TodoAttachment } from "@/lib/todo-types";

export function TodoAttachments({ todoId }: { todoId: string }) {
  const [files, setFiles] = useState<TodoAttachment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("todo_attachments")
      .select("*")
      .eq("todo_id", todoId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error(error.message);
      setFiles([]);
      return;
    }
    setFiles((data ?? []) as TodoAttachment[]);
  }, [todoId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Image thumbnails get their own longer-lived URL; non-images never fetch one.
  useEffect(() => {
    for (const file of files ?? []) {
      if (!isImage(file.mime_type) || previews[file.id]) continue;
      void signedUrl(file.storage_path, 3600).then(({ url }) => {
        if (url) setPreviews((current) => ({ ...current, [file.id]: url }));
      });
    }
  }, [files, previews]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;

    setBusy(true);
    for (const file of picked) {
      const { attachment, error } = await uploadTodoFile(todoId, file);
      if (error) toast.error(error);
      else if (attachment) setFiles((current) => [...(current ?? []), attachment]);
    }
    setBusy(false);
  }

  async function download(file: TodoAttachment) {
    const { url, error } = await signedUrl(file.storage_path, 60, file.file_name);
    if (error || !url) {
      toast.error(error ?? "Could not create a download link");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function remove(file: TodoAttachment) {
    setFiles((current) => current?.filter((f) => f.id !== file.id) ?? current);
    const error = await deleteTodoFile(file);
    if (error) {
      toast.error(error);
      await load();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          Attachments
        </span>
        <Button size="sm" variant="ghost" asChild disabled={busy}>
          <label className="cursor-pointer">
            {busy ? <Spinner /> : <UploadIcon />}
            Upload
            <input type="file" multiple hidden onChange={onPick} disabled={busy} />
          </label>
        </Button>
      </div>

      {files === null ? (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
      ) : files.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          No files yet — up to 25 MB each.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2"
            >
              {previews[file.id] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previews[file.id]}
                  alt=""
                  className="size-8 shrink-0 rounded object-cover"
                />
              ) : (
                <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px]">{file.file_name}</div>
                <div className="text-[10.5px] tabular-nums text-muted-foreground">
                  {formatBytes(file.byte_size)}
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Download ${file.file_name}`}
                onClick={() => void download(file)}
              >
                <DownloadIcon />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${file.file_name}`}
                onClick={() => void remove(file)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
