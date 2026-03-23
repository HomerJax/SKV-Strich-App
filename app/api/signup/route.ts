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

function createRedirectResponse(
  request: NextRequest,
  pathname: string,
  search?: URLSearchParams
) {
  return NextResponse.redirect(buildUrl(request, pathname, search), {
    status: 303,
  });
}

function buildErrorParams(code: string, email?: string) {
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
    return createRedirectResponse(
      request,
      "/signup",
      buildErrorParams("missing-fields", email)
    );
  }

  if (password !== passwordConfirm) {
    return createRedirectResponse(
      request,
      "/signup",
      buildErrorParams("password-mismatch", email)
    );
  }

  if (password.length < 8) {
    return createRedirectResponse(
      request,
      "/signup",
      buildErrorParams("password-too-short", email)
    );
  }

  const cookieStore = await cookies();

  const response = createRedirectResponse(request, "/club-setup");

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
            response.cookies.set(cookie.name, cookie.value, cookie.options);
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
      return createRedirectResponse(
        request,
        "/signup",
        buildErrorParams("email-already-used", email)
      );
    }

    return createRedirectResponse(
      request,
      "/signup",
      buildErrorParams("signup-failed", email)
    );
  }

  if (!signUpData.user) {
    return createRedirectResponse(
      request,
      "/signup",
      buildErrorParams("signup-failed", email)
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
    return createRedirectResponse(request, "/login");
  }

  return response;
}