"use client";

import { useParams, useRouter } from "next/navigation";
import { FundraisingDrawer } from "@/app/components/fundraising-drawer";
import { useStore } from "@/lib/factories-store";
import { Button } from "@/design-system/components/button";

export default function CompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { fundraisingLeads, fundraisingLead } = useStore();
  const leadId = params.id;
  const lead = fundraisingLead(leadId);

  if (!fundraisingLeads) {
    return (
      <div className="min-h-screen grid place-items-center text-sm tabular-nums uppercase tracking-wider text-muted-foreground">
        Loading programme…
      </div>
    );
  }

  if (!lead || lead.track !== "competition") {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-title text-foreground">Programme not found</h1>
          <Button onClick={() => router.push("/fundraising/competitions")} className="mt-4">
            Back to competitions & programmes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FundraisingDrawer
      leadId={leadId}
      variant="page"
      onClose={() => router.push("/fundraising/competitions")}
    />
  );
}
