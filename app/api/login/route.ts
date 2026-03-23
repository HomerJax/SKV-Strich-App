import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type MembershipRow = {
  club_id: string;
};

function buildUrl(
  request: NextRequest,
  pathname: string,
  search?: URLSearchParams
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search ? search.toString() : "";
  return url;
}

function buildErrorRedirect(
  request: NextRequest,
  code: string,
  email?: string
) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return NextResponse.redirect(buildUrl(request, "/login", params), {
    status: 303,
  });
}

function buildSuccessHtml(pathname: string) {
  return `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Weiterleitung…</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        color: #111;
      }
      .wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: 100%;
        max-width: 480px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 28px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.06);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 24px;
      }
      p {
        margin: 0;
        color: #555;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>Login erfolgreich</h1>
        <p>Du wirst jetzt automatisch weitergeleitet …</p>
      </div>
    </div>
    <script>
      window.location.replace(${JSON.stringify(pathname)});
    </script>
  </body>
</html>`;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return buildErrorRedirect(request, "missing-fields", email);
  }

  const cookieStore = await cookies();

  let pendingCookies: Array<{
    name: string;
    value: string;
    options?: {
      domain?: string;
      expires?: Date;
      httpOnly?: boolean;
      maxAge?: number;
      path?: string;
      sameSite?: "lax" | "strict" | "none" | boolean;
      secure?: boolean;
      priority?: "low" | "medium" | "high";
      partitioned?: boolean;
    };
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies = cookiesToSet.map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          }));

          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !signInData.user) {
    return buildErrorRedirect(request, "invalid-credentials", email);
  }

  const user = signInData.user;

  const { data: memberships, error: membershipsError } = await supabase
    .from("club_memberships")
    .select("club_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return buildErrorRedirect(request, "membership-load-failed", email);
  }

  const typedMemberships = (memberships ?? []) as MembershipRow[];

  let targetPath = "/";
  let activeClubId: string | null = null;

  if (typedMemberships.length === 0) {
    targetPath = "/club-setup";
  } else if (typedMemberships.length === 1) {
    targetPath = "/";
    activeClubId = typedMemberships[0].club_id;
  } else {
    targetPath = "/select-club";
  }

  const response = new NextResponse(buildSuccessHtml(targetPath), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-strikr-target": targetPath,
    },
  });

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  if (activeClubId) {
    response.cookies.set("active_club_id", activeClubId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return response;
}