import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function html(title: string, body: string) {
  return new NextResponse(
    `
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f5f5f5;
              color: #111;
              margin: 0;
              padding: 24px;
            }
            .card {
              max-width: 760px;
              margin: 40px auto;
              background: white;
              border: 1px solid #ddd;
              border-radius: 16px;
              padding: 24px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.06);
            }
            h1 { margin-top: 0; font-size: 24px; }
            pre {
              white-space: pre-wrap;
              word-break: break-word;
              background: #f7f7f7;
              border: 1px solid #e5e5e5;
              border-radius: 12px;
              padding: 16px;
              overflow: auto;
            }
            a {
              display: inline-block;
              margin-top: 16px;
              color: #111;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${title}</h1>
            <pre>${body}</pre>
            <a href="/club-setup">Zurück zu /club-setup</a>
          </div>
        </body>
      </html>
    `,
    {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();

  if (!displayName) {
    return html(
      "DEBUG: Kein Teamname",
      JSON.stringify(
        {
          step: "validate",
          ok: false,
          reason: "missing-name",
        },
        null,
        2
      )
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return html(
      "DEBUG: getUser Fehler",
      JSON.stringify(
        {
          step: "auth.getUser",
          ok: false,
          error: userError.message,
        },
        null,
        2
      )
    );
  }

  if (!user) {
    return html(
      "DEBUG: Kein eingeloggter User in club-setup route",
      JSON.stringify(
        {
          step: "auth.getUser",
          ok: false,
          user: null,
          cookies: cookieStore.getAll().map((c) => c.name),
          note: "Wenn du das siehst, kommt die Session in dieser Route nicht an.",
        },
        null,
        2
      )
    );
  }

  const { data: existingMemberships, error: existingError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id)
    .limit(2);

  if (existingError) {
    return html(
      "DEBUG: Fehler beim Laden vorhandener Memberships",
      JSON.stringify(
        {
          step: "load-memberships",
          ok: false,
          userId: user.id,
          error: existingError.message,
        },
        null,
        2
      )
    );
  }

  if ((existingMemberships ?? []).length === 1) {
    return html(
      "DEBUG: User hat bereits genau einen Club",
      JSON.stringify(
        {
          step: "already-has-one-membership",
          ok: true,
          userId: user.id,
          existingMemberships,
          note: "Dann sollte eigentlich nur active_club_id gesetzt und auf / weitergeleitet werden.",
        },
        null,
        2
      )
    );
  }

  if ((existingMemberships ?? []).length > 1) {
    return html(
      "DEBUG: User hat mehrere Clubs",
      JSON.stringify(
        {
          step: "already-has-multiple-memberships",
          ok: true,
          userId: user.id,
          existingMemberships,
          note: "Dann sollte eigentlich /select-club kommen.",
        },
        null,
        2
      )
    );
  }

  const { data: createdClub, error: clubError } = await supabase
    .from("clubs")
    .insert({
      display_name: displayName,
    })
    .select("id")
    .single();

  if (clubError || !createdClub) {
    return html(
      "DEBUG: Club konnte nicht erstellt werden",
      JSON.stringify(
        {
          step: "create-club",
          ok: false,
          userId: user.id,
          displayName,
          error: clubError?.message ?? "unknown",
        },
        null,
        2
      )
    );
  }

  const clubId = createdClub.id as string;

  const { error: membershipError } = await supabase
    .from("club_memberships")
    .insert({
      user_id: user.id,
      club_id: clubId,
      role: "admin",
    });

  if (membershipError) {
    return html(
      "DEBUG: Membership konnte nicht erstellt werden",
      JSON.stringify(
        {
          step: "create-membership",
          ok: false,
          userId: user.id,
          clubId,
          error: membershipError.message,
        },
        null,
        2
      )
    );
  }

  const { error: settingsError } = await supabase.from("club_settings").insert({
    club_id: clubId,
  });

  if (settingsError) {
    return html(
      "DEBUG: club_settings konnte nicht erstellt werden",
      JSON.stringify(
        {
          step: "create-settings",
          ok: false,
          userId: user.id,
          clubId,
          error: settingsError.message,
        },
        null,
        2
      )
    );
  }

  return html(
    "DEBUG: Team erfolgreich angelegt",
    JSON.stringify(
      {
        step: "success",
        ok: true,
        userId: user.id,
        clubId,
        displayName,
        note: "Wenn du das siehst, funktioniert das Anlegen. Dann sitzt das Problem erst NACH dieser Route.",
      },
      null,
      2
    )
  );
}