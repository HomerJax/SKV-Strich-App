import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getBaseUrl(
  forwardedProto: string | null,
  forwardedHost: string | null,
  host: string | null,
  fallback?: string | null
) {
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const isLocalhost =
      host.includes("localhost") || host.startsWith("127.0.0.1");
    return `${isLocalhost ? "http" : "https"}://${host}`;
  }

  if (fallback) {
    return fallback;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function resolveRedirect(baseUrl: string, nextValue: string) {
  if (!nextValue) return `${baseUrl}/`;

  if (nextValue.startsWith("http://") || nextValue.startsWith("https://")) {
    return nextValue;
  }

  if (nextValue.startsWith("/")) {
    return `${baseUrl}${nextValue}`;
  }

  return `${baseUrl}/`;
}

async function autoLinkPlayerByEmail(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  email: string
) {
  const { data, error } = await supabase.rpc("link_existing_player_by_email", {
    p_user_id: userId,
    p_email: email,
  });

  if (error) {
    console.error("Auto-link signup failed", error);
    return null;
  }

  return data ?? null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const nextValue = String(formData.get("next") || "/");
    const baseUrlFromForm = String(formData.get("baseUrl") || "").trim();

    const cookieStore = await cookies();
    const headerStore = await headers();

    const forwardedProto = headerStore.get("x-forwarded-proto");
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = headerStore.get("host");

    const baseUrl = getBaseUrl(
      forwardedProto,
      forwardedHost,
      host,
      baseUrlFromForm || null
    );

    if (!email || !password) {
      return NextResponse.redirect(
        `${baseUrl}/signup?error=missing_fields&next=${encodeURIComponent(nextValue)}`
      );
    }

    if (password.length < 8) {
      return NextResponse.redirect(
        `${baseUrl}/signup?error=password_too_short&next=${encodeURIComponent(nextValue)}`
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const emailRedirectTo = `${baseUrl}/auth/callback`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      const message = error.message.toLowerCase();

      if (
        message.includes("already registered") ||
        message.includes("already been registered") ||
        message.includes("user already registered")
      ) {
        return NextResponse.redirect(
          `${baseUrl}/signup?error=email_exists&next=${encodeURIComponent(nextValue)}`
        );
      }

      console.error("Signup failed", error);

      return NextResponse.redirect(
        `${baseUrl}/signup?error=signup_failed&next=${encodeURIComponent(nextValue)}`
      );
    }

    const session = data.session;
    const user = data.user;

    if (!session || !user?.id || !user.email) {
      return NextResponse.redirect(
        `${baseUrl}/signup?success=check_email&next=${encodeURIComponent(nextValue)}`
      );
    }

    await autoLinkPlayerByEmail(supabase, user.id, user.email);

    return NextResponse.redirect(resolveRedirect(baseUrl, nextValue));
  } catch (error) {
    console.error("Signup route crashed", error);

    const headerStore = await headers();
    const forwardedProto = headerStore.get("x-forwarded-proto");
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = headerStore.get("host");
    const baseUrl = getBaseUrl(forwardedProto, forwardedHost, host);

    return NextResponse.redirect(`${baseUrl}/signup?error=signup_failed`);
  }
}