import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
        setAll() {
          // in Route Handler hier nicht benötigt
        },
      },
    }
  );
}

async function buildRedirectUrl(path: string) {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = headerStore.get("host");

  if (forwardedProto && forwardedHost) {
    return new URL(path, `${forwardedProto}://${forwardedHost}`);
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(path, process.env.NEXT_PUBLIC_SITE_URL);
  }

  return new URL(path, `http://${host ?? "localhost:3000"}`);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const userId = formData.get("userId");

  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=member_remove_failed")
    );
  }

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(await buildRedirectUrl("/login"));
  }

  const { data, error } = await supabase.rpc("admin_remove_member", {
    target_user_id: userId,
  });

  if (error) {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=member_remove_failed")
    );
  }

  if (data === "cannot_remove_yourself") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=cannot_remove_yourself")
    );
  }

  if (data === "last_admin_must_remain") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=last_admin_must_remain")
    );
  }

  if (data !== "ok") {
    return NextResponse.redirect(
      await buildRedirectUrl("/admin/members?error=not_allowed")
    );
  }

  return NextResponse.redirect(
    await buildRedirectUrl("/admin/members?success=member_removed")
  );
}