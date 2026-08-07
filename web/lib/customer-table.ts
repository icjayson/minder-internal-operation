import type { Contact, Factory } from "./types";

type CustomerLocationFields = Pick<
  Factory,
  "hq_location" | "country" | "geo_tier"
>;

export function customerLocation(factory: CustomerLocationFields): string {
  const locations = [factory.hq_location, factory.country]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(locations)].join(", ") || factory.geo_tier?.trim() || "—";
}

export function customerContactNames(
  contacts: ReadonlyArray<Pick<Contact, "full_name">>,
): string {
  const names = contacts
    .map((contact) => contact.full_name.trim())
    .filter(Boolean);

  return names.join(", ") || "—";
}
