import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import StandingsClient from "./StandingsClient";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

export default async function StandingsPage() {
  const cookieStore = await cookies();
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/standings");
  }

  const { data: membershipsData, error } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  const memberships = (membershipsData ?? []) as MembershipRow[];

  if (memberships.length === 0) {
    redirect("/club-setup");
  }

  const validClubIds = new Set(memberships.map((m) => m.club_id));

  const activeClubId =
    memberships.length === 1
      ? memberships[0].club_id
      : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
        ? activeClubIdFromCookie
        : null;

  if (!activeClubId) {
    redirect("/select-club");
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Lade Tabelle…
        </div>
      }
    >
      <StandingsClient initialClubId={activeClubId} />
    </Suspense>
  );
}