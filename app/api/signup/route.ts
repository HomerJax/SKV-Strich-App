import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type PendingCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

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

function redirectResponse(
  request: NextRequest,
  pathname: string,
  pendingCookies: PendingCookie[],
  search?: URLSearchParams
) {
  const response = NextResponse.redirect(buildUrl(request, pathname, search), {
    status: 303,
  });

  for (const cookie of pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}

function errorParams(code: string, email?: string) {
  const params = new URLSearchParams();
  params.set("error", code);

  if (email) {
    params.set("email", email);
  }

  return params;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = toText(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!email || !password || !passwordConfirm) {
    return NextResponse.redirect(
      buildUrl(request, "/signup", errorParams("missing-fields", email)),
      { status: 303 }
    );
  }

  if (password !== passwordConfirm) {
    return NextResponse.redirect(
      buildUrl(request, "/signup", errorParams("password-mismatch", email)),
      { status: 303 }
    );
  }

  if (password.length < 8) {
    return NextResponse.redirect(
      buildUrl(request, "/signup", errorParams("password-too-short", email)),
      { status: 303 }
    );
  }

  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          pendingCookies.length = 0;

          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
            pendingCookies.push({
              name: cookie.name,
              value: cookie.value,
              options: cookie.options,
            });
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
      return NextResponse.redirect(
        buildUrl(request, "/signup", errorParams("email-already-used", email)),
        { status: 303 }
      );
    }

    return NextResponse.redirect(
      buildUrl(request, "/signup", errorParams("signup-failed", email)),
      { status: 303 }
    );
  }

  if (!signUpData.user) {
    return NextResponse.redirect(
      buildUrl(request, "/signup", errorParams("signup-failed", email)),
      { status: 303 }
    );
  }

  await supabase.rpc("link_existing_player_by_email", {
    user_email: email,
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return redirectResponse(request, "/login", pendingCookies);
  }

  return redirectResponse(request, "/club-setup", pendingCookies);
}