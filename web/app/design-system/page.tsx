import { redirect } from "next/navigation";

/** /design-system has no content of its own — the general system is the front door. */
export default function DesignSystemIndexPage() {
  redirect("/design-system/general");
}
