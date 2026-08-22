import type { Metadata } from "next";

import LocalComponentLibrary from "./LocalComponentLibrary";

export const metadata: Metadata = {
  title: "Component library | Minder Ops",
  description: "Every vendored shadcn component, with live previews and source.",
};

export default function ComponentLibraryPage() {
  return <LocalComponentLibrary />;
}
