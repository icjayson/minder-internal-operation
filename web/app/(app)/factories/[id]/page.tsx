"use client";

import { useParams, useRouter } from "next/navigation";
import { FactoryDrawer } from "@/app/components/factory-drawer";
import { useStore } from "@/lib/factories-store";
import { Button } from "@/design-system/components/button";

export default function FactoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { factories, factory } = useStore();
  const factoryId = params.id;
  const selected = factory(factoryId);

  if (!factories) {
    return (
      <div className="min-h-screen grid place-items-center text-sm tabular-nums uppercase tracking-wider text-muted-foreground">
        Loading factory…
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-title text-foreground">Factory not found</h1>
          <Button onClick={() => router.push("/factories")} className="mt-4">
            Back to factories
          </Button>
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
