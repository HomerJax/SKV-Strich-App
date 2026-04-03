import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

type SearchParams = {
  token?: string | string[];
  error?: string | string[];
  message?: string | string[];
};

function getSingle(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function isInviteExpired(expiresAt: string | null) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = getSingle(resolvedSearchParams?.token);
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Einladung ungültig
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Es wurde kein Einladungstoken übergeben.
          </p>
        </div>
      </main>
    );
  }

  const cookieStore = await cookies();

  const authSupabase = createServerClient(
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

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const joinPath = `/join?token=${encodeURIComponent(token)}`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(joinPath)}`);
  }

  const { data: player } = await authSupabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_guest", false)
    .limit(1)
    .maybeSingle();

  if (!player) {
    redirect(`/onboarding?next=${encodeURIComponent(joinPath)}`);
  }

  const { data: invite, error: inviteError } = await adminSupabase
    .from("invites")
    .select("club_id, role, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Einladung nicht gefunden
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Dieser Einladungslink ist ungültig oder nicht mehr verfügbar.
          </p>
        </div>
      </main>
    );
  }

  const expired = isInviteExpired(invite.expires_at);

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Club beitreten
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Du wurdest eingeladen, einem Club in{" "}
            <span className="font-semibold">strikr</span> beizutreten.
          </p>
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {expired ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Diese Einladung ist abgelaufen.
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm text-neutral-500">Rolle</div>
          <div className="mt-1 font-medium text-neutral-900">
            {invite.role === "admin" ? "Admin" : "Mitglied"}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Dieser Einladungslink ist mehrfach nutzbar, bis er im Adminbereich gelöscht wird.
        </div>

        {expired ? null : (
          <form method="post" action="/api/join">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              Einladung annehmen
            </button>
          </form>
        )}
      </div>
    </main>
  );
}