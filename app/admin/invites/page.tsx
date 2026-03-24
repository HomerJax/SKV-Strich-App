import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import InviteShareActions from "./InviteShareActions";

async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );
}

async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership || membership.role !== "admin") {
    redirect("/");
  }

  return { supabase, clubId: membership.club_id };
}

async function createInviteAction(formData: FormData) {
  "use server";

  const { supabase } = await requireAdmin();

  const role = String(formData.get("role") ?? "member").trim();
  const expiresInDays = Number(
    String(formData.get("expires_in_days") ?? "14").trim()
  );

  const safeRole = role === "admin" ? "admin" : "member";
  const safeDays =
    Number.isFinite(expiresInDays) && expiresInDays >= 0 && expiresInDays <= 365
      ? expiresInDays
      : 14;

  const { error } = await supabase.rpc("create_club_invite", {
    p_role: safeRole,
    p_expires_in_days: safeDays,
  });

  if (error) {
    redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/invites");
  redirect("/admin/invites?saved=1");
}

async function deactivateInviteAction(formData: FormData) {
  "use server";

  const { supabase, clubId } = await requireAdmin();

  const id = Number(String(formData.get("id") ?? ""));

  if (!id) {
    redirect("/admin/invites?error=Ungültige Einladung");
  }

  const { error } = await supabase
    .from("club_invites")
    .update({ is_active: false })
    .eq("id", id)
    .eq("club_id", clubId);

  if (error) {
    redirect(`/admin/invites?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/invites");
  redirect("/admin/invites?saved=1");
}

function getBaseUrl(
  headerList: Awaited<ReturnType<typeof headers>>
) {
  const forwardedProto = headerList.get("x-forwarded-proto");
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost || headerList.get("host");

  if (host) {
    return `${forwardedProto || "https"}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export default async function AdminInvitesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const saved = resolvedSearchParams.saved;
  const error = resolvedSearchParams.error;

  const { supabase, clubId } = await requireAdmin();
  const headerList = await headers();
  const baseUrl = getBaseUrl(headerList);

  const { data: invites } = await supabase
    .from("club_invites")
    .select("id, token, role, created_at, expires_at, used_at, is_active")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-slate-800/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Einladungen
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Erzeuge Join-Links für neue Mitglieder deines Clubs und teile sie
            direkt weiter.
          </p>
        </div>

        {saved ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Änderung gespeichert.
          </div>
        ) : null}

        {typeof error === "string" && error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-6 rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Neue Einladung
          </h2>

          <form action={createInviteAction} className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Rolle
              </label>
              <select
                name="role"
                defaultValue="member"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              >
                <option value="member">Mitglied</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Gültig für Tage
              </label>
              <input
                type="number"
                name="expires_in_days"
                min={0}
                max={365}
                defaultValue={14}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900"
              />
              <p className="mt-1 text-xs text-slate-500">
                0 = läuft nicht automatisch ab
              </p>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Einladung erzeugen
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-950">
            Bestehende Einladungen
          </h2>

          {!invites || invites.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Noch keine Einladungen vorhanden.
            </div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite) => {
                const inviteUrl = `${baseUrl}/invite/${invite.token}`;
                const isUsed = !!invite.used_at;
                const isExpired = invite.expires_at
                  ? new Date(invite.expires_at).getTime() < Date.now()
                  : false;
                const roleLabel =
                  invite.role === "admin" ? "Admin" : "Mitglied";

                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.1fr,1.4fr]">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          Rolle: {roleLabel}
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          Erstellt am{" "}
                          {new Date(invite.created_at).toLocaleString("de-DE")}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Läuft ab:{" "}
                          {invite.expires_at
                            ? new Date(invite.expires_at).toLocaleString("de-DE")
                            : "nie"}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1">
                            {invite.is_active ? "aktiv" : "deaktiviert"}
                          </span>

                          {isUsed ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                              verwendet
                            </span>
                          ) : null}

                          {!isUsed && isExpired ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                              abgelaufen
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-800">
                          Einladungslink
                        </label>
                        <input
                          readOnly
                          value={inviteUrl}
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900"
                        />

                        <InviteShareActions
                          inviteUrl={inviteUrl}
                          clubRoleLabel={roleLabel}
                        />
                      </div>
                    </div>

                    {!isUsed && invite.is_active ? (
                      <form
                        action={deactivateInviteAction}
                        className="mt-4 flex justify-end"
                      >
                        <input type="hidden" name="id" value={invite.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Einladung deaktivieren
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}