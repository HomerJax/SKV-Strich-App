import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import AutoJoinForm from "./AutoJoinForm";
import { getServerI18n } from "@/lib/i18n/server";

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
  const { t } = await getServerI18n();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const token = getSingle(resolvedSearchParams?.token);
  const error = getSingle(resolvedSearchParams?.error);
  const message = getSingle(resolvedSearchParams?.message);

  if (!token) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {t("join.invalid")}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {t("join.noToken")}
          </p>
        </div>
      </main>
    );
  }

  const joinPath = `/join?token=${encodeURIComponent(token)}`;
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

  const { data: invite, error: inviteError } = await adminSupabase
    .from("invites")
    .select("id, club_id, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {t("join.notFound")}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {t("join.notAvailable")}
          </p>
        </div>
      </main>
    );
  }

  const expired = isInviteExpired(invite.expires_at);

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  let hasPlayer = false;

  if (user) {
    const { data: players } = await authSupabase
      .from("players")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_guest", false)
      .limit(1);

    hasPlayer = (players?.length ?? 0) > 0;
  }

  const loginHref = `/login?next=${encodeURIComponent(joinPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(joinPath)}`;
  const onboardingHref = `/onboarding?next=${encodeURIComponent(joinPath)}`;

  const shouldAutoAccept = !expired && !!user && hasPlayer;

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("join.title")}
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            {t("join.description")}
          </p>

          {!user ? (
            <div className="mt-4 text-sm text-neutral-500">
              {t("join.newHere")}
              <br />
              {t("join.alreadyHere")}
            </div>
          ) : null}
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
            {t("join.expired")}
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div className="text-sm text-neutral-500">{t("join.role")}</div>
          <div className="mt-1 font-medium text-neutral-900">
            {invite.role === "admin" ? "Admin" : t("join.member")}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {t("join.multiUse")}
        </div>

        {expired ? null : !user ? (
          <div className="space-y-3">
            <Link
              href={loginHref}
              className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {t("join.login")}
            </Link>

            <Link
              href={signupHref}
              className="flex w-full items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
            >
              {t("join.signup")}
            </Link>

            <p className="text-center text-xs text-neutral-500">
              {t("join.returnHint")}
            </p>
          </div>
        ) : !hasPlayer ? (
          <div className="space-y-3">
            <Link
              href={onboardingHref}
              className="flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {t("join.createProfile")}
            </Link>

            <p className="text-center text-xs text-neutral-500">
              {t("join.profileThen")}
            </p>
          </div>
        ) : shouldAutoAccept ? (
          <>
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {t("join.accepting")}
            </div>

            <AutoJoinForm token={token} />
          </>
        ) : (
          <form method="post" action="/api/join">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {t("join.accept")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}