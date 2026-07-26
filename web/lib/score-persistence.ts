type UpdateError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type UpdateResult = { error: UpdateError | null };

export function isMissingScoredAtError(error: UpdateError | null): boolean {
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return (
    text.includes("scored_at") &&
    (error.code === "42703" || error.code === "PGRST204" || text.includes("column"))
  );
}

// Some existing databases skipped migration 011 and do not have
// factories.scored_at. Save the score fields anyway, while returning whether the
// freshness timestamp was persisted so callers can surface the schema drift.
export async function persistFactoryScore(
  update: (patch: Record<string, unknown>) => PromiseLike<UpdateResult>,
  patch: Record<string, unknown>,
): Promise<{ error: UpdateError | null; persistedScoredAt: boolean }> {
  const first = await update(patch);
  if (!isMissingScoredAtError(first.error)) {
    return { error: first.error, persistedScoredAt: true };
  }

  const { scored_at: _scoredAt, ...compatiblePatch } = patch;
  const fallback = await update(compatiblePatch);
  return { error: fallback.error, persistedScoredAt: false };
}

