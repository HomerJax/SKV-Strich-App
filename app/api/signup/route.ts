import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function toText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function buildRedirect(
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

  return NextResponse.redirect(buildRedirect(request, "/signup", params), {
    status: 303,
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = toText(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  if (!email || !password || !passwordConfirm) {
    return buildErrorRedirect(request, "missing-fields", email);
  }

  if (password !== passwordConfirm) {
    return buildErrorRedirect(request, "password-mismatch", email);
  }

  if (password.length < 8) {
    return buildErrorRedirect(request, "password-too-short", email);
  }

  const cookieStore = await cookies();
  const response = NextResponse.next();

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

    if (message.includes("already registered") || message.includes("already been registered")) {
      return buildErrorRedirect(request, "email-already-used", email);
    }

    return buildErrorRedirect(request, "signup-failed", email);
  }

  if (!signUpData.user) {
    return buildErrorRedirect(request, "signup-failed", email);
  }

  await supabase.rpc("link_existing_player_by_email", {
    user_email: email,
  });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.redirect(buildRedirect(request, "/login"), {
      status: 303,
    });
  }

  return NextResponse.redirect(buildRedirect(request, "/club-setup"), {
    status: 303,
  });
}