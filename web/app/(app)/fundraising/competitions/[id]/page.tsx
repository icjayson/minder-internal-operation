"use client";

import { useParams, useRouter } from "next/navigation";
import { FundraisingDrawer } from "@/app/components/fundraising-drawer";
import { useStore } from "@/lib/factories-store";

export default function CompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { fundraisingLeads, fundraisingLead } = useStore();
  const leadId = params.id;
  const lead = fundraisingLead(leadId);

  if (!fundraisingLeads) {
    return (
      <div className="min-h-screen grid place-items-center text-sm mono uppercase tracking-wider text-muted-foreground">
        Loading programme…
      </div>
    );
  }

  if (!lead || lead.track !== "competition") {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-display text-ink">Programme not found</h1>
          <button onClick={() => router.push("/fundraising/competitions")}
            className="mt-4 h-9 px-4 rounded-full bg-primary text-white text-[12.5px] font-medium cursor-pointer">
            Back to competitions & programmes
          </button>
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
