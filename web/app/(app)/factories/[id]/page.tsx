"use client";

import { useParams, useRouter } from "next/navigation";
import { FactoryDrawer } from "@/app/components/factory-drawer";
import { useStore } from "@/lib/factories-store";

export default function FactoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { factories, factory } = useStore();
  const factoryId = params.id;
  const selected = factory(factoryId);

  if (!factories) {
    return (
      <div className="min-h-screen grid place-items-center text-sm mono uppercase tracking-wider text-muted">
        Loading factory…
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-display text-ink">Factory not found</h1>
          <button onClick={() => router.push("/factories")}
            className="mt-4 h-9 px-4 rounded-full bg-accent text-white text-[12.5px] font-medium cursor-pointer">
            Back to factories
          </button>
        </div>
      </div>
    );
  }

  return (
    <FactoryDrawer
      factoryId={factoryId}
      variant="page"
      onClose={() => router.push("/factories")}
    />
  );
}
