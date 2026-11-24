import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import ProTrialPreview from "./ProTrialPreview";

export const dynamic = "force-dynamic";

export default async function Page() {
  const ctx = await requireClub();
  if (!ctx.isPowerUser) notFound();
  return <ProTrialPreview />;
}
