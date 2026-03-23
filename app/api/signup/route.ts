import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

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

function redirectWithError(
  request: NextRequest,
  code: string,
  email?: string
) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return NextResponse.redirect(buildUrl(request, "/signup", params), {
    status: 303,
  });
}

function successHtmlRedirect(pathname: string) {
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
        <h1>Account erstellt</h1>
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

  const email = toText(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!email || !password || !passwordConfirm) {
    return redirectWithError(request, "missing-fields", email);
  }

  if (password !== passwordConfirm) {
    return redirectWithError(request, "password-mismatch", email);
  }

  if (password.length < 8) {
    return redirectWithError(request, "password-too-short", email);
  }

  const cookieStore = await cookies();

  const successResponse = new NextResponse(successHtmlRedirect("/club-setup"), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });

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
            successResponse.cookies.set(
              cookie.name,
              cookie.value,
              cookie.options
            );
          }
        },
      },
    }
  );

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    const message = signUpError.message.toLowerCase();

    if (
      message.includes("already registered") ||
      message.includes("already been registered") ||
      message.includes("user already registered")
    ) {
      return redirectWithError(request, "email-already-used", email);
    }

    return redirectWithError(request, "signup-failed", email);
  }

  if (!signUpData.user) {
    return redirectWithError(request, "signup-failed", email);
  }

  try {
    await supabase.rpc("link_existing_player_by_email", {
      user_email: email,
    });
  } catch {
    // bewusst unkritisch
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return redirectWithError(request, "invalid-credentials", email);
  }

  return successResponse;
}