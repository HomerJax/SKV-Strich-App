import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import AttendanceReviewClient from "./AttendanceReviewClient";

export const dynamic="force-dynamic";
export default async function AttendanceReviewPage({params}:{params:Promise<{id:string}>}) {
  const sessionId=Number((await params).id);
  if(!Number.isSafeInteger(sessionId))notFound();
  const access=await requireSessionAccess(sessionId);
  if("error" in access)notFound();
  if(!canManageClub({isPowerUser:access.isPowerUser,role:access.membership.role})&&!access.canLeadTraining)redirect(`/sessions/${sessionId}`);
  return <main className="min-h-screen bg-slate-50 px-4 py-6">
    <div className="mx-auto max-w-3xl">
      <Link href={`/sessions/${sessionId}`} className="text-sm font-semibold text-cyan-700">← Zurück zum Training</Link>
      <h1 className="mt-5 text-2xl font-black text-slate-900">Teilnahme prüfen</h1>
      <p className="mt-1 text-sm text-slate-600">Späte Absagen über Freunde erfassen, Nichterscheinen dokumentieren und Strafen vor dem Buchen bestätigen.</p>
      <AttendanceReviewClient sessionId={sessionId}/>
    </div>
  </main>;
}
