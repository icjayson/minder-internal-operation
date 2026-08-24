"use client";

import { useParams, useRouter } from "next/navigation";
import { FactoryDrawer } from "@/app/components/factory-drawer";
import { useStore } from "@/lib/factories-store";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { factories, factory } = useStore();
  const customerId = params.id;
  const selected = factory(customerId);

  if (!factories) {
    return (
      <div className="min-h-screen grid place-items-center text-sm tabular-nums uppercase tracking-wider text-muted-foreground">
        Loading customer…
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-display text-foreground">Customer not found</h1>
          <button onClick={() => router.push("/customers")}
            className="mt-4 h-9 px-4 rounded-full bg-primary text-white text-[12.5px] font-medium cursor-pointer">
            Back to customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <FactoryDrawer
      factoryId={customerId}
      variant="page"
      basePath="/customers"
      showNotifications={false}
      onClose={() => router.push("/customers")}
    />
  );
}
