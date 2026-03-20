import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function getBaseUrl(
  forwardedProto: string | null,
  forwardedHost: string | null,
  host: string | null
) {
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const isLocalhost =
      host.includes("localhost") || host.startsWith("127.0.0.1");
    return `${isLocalhost ? "http" : "https"}://${host}`;
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
    console.error("Auto-link login failed", error);
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

    const cookieStore = await cookies();
    const headerStore = await headers();

    const forwardedProto = headerStore.get("x-forwarded-proto");
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = headerStore.get("host");
    const baseUrl = getBaseUrl(forwardedProto, forwardedHost, host);

    if (!email || !password) {
      return NextResponse.redirect(`${baseUrl}/?error=login_failed`);
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

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Login failed", signInError);
      return NextResponse.redirect(`${baseUrl}/?error=login_failed`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id && user.email) {
      await autoLinkPlayerByEmail(supabase, user.id, user.email);
    }

    return NextResponse.redirect(resolveRedirect(baseUrl, nextValue));
  } catch (error) {
    console.error("Login route crashed", error);

    const headerStore = await headers();
    const forwardedProto = headerStore.get("x-forwarded-proto");
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = headerStore.get("host");
    const baseUrl = getBaseUrl(forwardedProto, forwardedHost, host);

    return NextResponse.redirect(`${baseUrl}/?error=login_failed`);
  }
}