import type { RoleLevel } from "./types";

const TOP_LEVEL_TITLE =
  /\b(?:ceo|chief\s+executive\s+officer|co[\s-]?founder|founder|owner)\b/i;

export function isTopLevelContactTitle(roleTitle: string | null | undefined): boolean {
  return TOP_LEVEL_TITLE.test(roleTitle?.trim() ?? "");
}

export function effectiveContactRoleLevel(
  roleTitle: string | null | undefined,
  roleLevel: RoleLevel | null | undefined,
): RoleLevel | null {
  return isTopLevelContactTitle(roleTitle) ? "high" : (roleLevel ?? null);
}
