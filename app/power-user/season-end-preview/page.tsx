import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import SeasonEndPreviewClient from "./SeasonEndPreviewClient";

export const dynamic = "force-dynamic";
export default async function SeasonEndPreviewPage() {
  const ctx = await requireClub();
  if (!ctx.isPowerUser) notFound();
  return <SeasonEndPreviewClient/>;
}
