import { redirect } from "next/navigation";

// Fundraising is split into two sub-tracks (see the sidebar group). Land on
// Investors by default.
export default function FundraisingPage() {
  redirect("/fundraising/investors");
}
