import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import InviteSignupForm from "./InviteSignupForm";

type InviteInfo = {
  club_name: string;
  role: "admin" | "member";
  is_valid: boolean;
  is_expired: boolean;
  is_accepted: boolean;
  expires_at: string;
};

async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function StatusBox({
  type,
  title,
  text,
}: {
  type: "success" | "warning" | "error";
  title: string;
  text: string;
}) {
  const styles =
    type === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : type === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";

  return (
    <div className={`rounded-2xl border px-4 py-4 ${styles}`}>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm">{text}</div>
    </div>
  );
}

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const supabase = await getSupabaseServerClient();

  const [
    { data, error },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.rpc("get_invite_public", {
      p_token: token,
    }),
    supabase.auth.getUser(),
  ]);

  if (error) {
    throw new Error(`Invite could not be loaded: ${error.message}`);
  }

  const invite = (data?.[0] as InviteInfo | undefined) ?? null;

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-10">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Einladung nicht gefunden
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Dieser Einladungslink ist ungültig oder existiert nicht.
            </p>
          </div>

          <StatusBox
            type="error"
            title="Ungültiger Link"
            text="Bitte prüfe den Link oder frage deinen Admin nach einer neuen Einladung."
          />

          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Zum Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isReady = invite.is_valid && !invite.is_expired && !invite.is_accepted;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            strikr Einladung
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Einladung zu {invite.club_name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Du wurdest zu einem Club bei strikr eingeladen.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-slate-50 px-4 py-4">
          <div className="text-sm text-slate-500">Club</div>
          <div className="text-base font-medium text-slate-900">
            {invite.club_name}
          </div>

          <div className="mt-4 text-sm text-slate-500">Rolle</div>
          <div className="text-base font-medium text-slate-900">
            {invite.role === "admin" ? "Admin" : "Mitglied"}
          </div>

          <div className="mt-4 text-sm text-slate-500">Läuft ab</div>
          <div className="text-base font-medium text-slate-900">
            {formatDate(invite.expires_at)}
          </div>
        </div>

        {isReady ? (
          <>
            <StatusBox
              type="success"
              title="Einladung ist gültig"
              text="Lege jetzt deinen Account an. Du wirst direkt als Spieler im Club erstellt."
            />

            {user ? (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                Du bist bereits eingeloggt. Bitte logge dich zuerst aus oder
                öffne den Einladungslink in einem privaten Fenster, wenn du
                einen neuen Spieler-Account anlegen willst.
              </div>
            ) : (
              <InviteSignupForm token={token} clubName={invite.club_name} />
            )}
          </>
        ) : invite.is_accepted ? (
          <StatusBox
            type="warning"
            title="Einladung bereits verwendet"
            text="Dieser Einladungslink wurde bereits eingelöst. Bitte frage deinen Admin nach einem neuen Link."
          />
        ) : invite.is_expired ? (
          <StatusBox
            type="warning"
            title="Einladung abgelaufen"
            text="Dieser Einladungslink ist abgelaufen. Bitte frage deinen Admin nach einem neuen Link."
          />
        ) : (
          <StatusBox
            type="error"
            title="Einladung ungültig"
            text="Dieser Einladungslink kann nicht verwendet werden."
          />
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {!isReady || user ? (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Zum Login
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}