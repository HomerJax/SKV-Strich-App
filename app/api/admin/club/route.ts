import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

type AdminClubContext =
  | { club: ClubRow }
  | { error: "unauthorized" | "missing_club" };

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function redirectToAdmin(
  request: NextRequest,
  params?: Record<string, string>
) {
  const url = new URL("/admin/club", request.url);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, { status: 303 });
}

async function getSupabaseAuthClient() {
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
          // no-op
        },
      },
    }
  );
}

function getSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

async function getAdminClubContext(): Promise<AdminClubContext> {
  const supabase = await getSupabaseAuthClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "unauthorized" };
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    console.error("club membership lookup failed", membershipError);
    return { error: "unauthorized" };
  }

  const membership = (membershipData as MembershipRow | null) ?? null;

  if (!membership?.club_id) {
    return { error: "missing_club" };
  }

  const { data: clubData, error: clubError } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path")
    .eq("id", membership.club_id)
    .maybeSingle();

  if (clubError) {
    console.error("club lookup failed", clubError);
    return { error: "missing_club" };
  }

  const club = (clubData as ClubRow | null) ?? null;

  if (!club) {
    return { error: "missing_club" };
  }

  return { club };
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value !== "string" &&
    value !== null &&
    typeof value.name === "string" &&
    typeof value.size === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAdminClubContext();

    if ("error" in context) {
      return redirectToAdmin(request, { error: context.error });
    }

    const { club } = context;
    const supabase = getSupabaseServiceClient();
    const formData = await request.formData();

    const removeLogo = formData.get("remove_logo") === "1";

    if (removeLogo) {
      if (club.logo_path) {
        const { error: storageRemoveError } = await supabase.storage
          .from("club-logos")
          .remove([club.logo_path]);

        if (storageRemoveError) {
          console.error("club logo remove storage error", storageRemoveError);
        }
      }

      const { error: updateError } = await supabase
        .from("clubs")
        .update({ logo_path: null })
        .eq("id", club.id);

      if (updateError) {
        console.error("club remove logo db error", updateError);
        return redirectToAdmin(request, { error: "remove_failed" });
      }

      return redirectToAdmin(request, { saved: "1" });
    }

    const rawDisplayName = formData.get("display_name");
    const displayName =
      typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";

    const logoEntry = formData.get("logo");
    let nextLogoPath = club.logo_path;

    if (isUploadedFile(logoEntry) && logoEntry.size > 0 && logoEntry.name.trim()) {
      const file = logoEntry;

      if (!ALLOWED_TYPES.includes(file.type)) {
        return redirectToAdmin(request, { error: "invalid_file" });
      }

      if (file.size > MAX_FILE_SIZE) {
        return redirectToAdmin(request, { error: "file_too_large" });
      }

      const safeName = safeFileName(file.name || "club-logo.png");
      const filePath = `${club.id}/${Date.now()}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("club logo upload error", uploadError);
        return redirectToAdmin(request, { error: "save_failed" });
      }

      nextLogoPath = filePath;
    }

    const { error: updateError } = await supabase
      .from("clubs")
      .update({
        display_name: displayName || null,
        logo_path: nextLogoPath,
      })
      .eq("id", club.id);

    if (updateError) {
      console.error("club update error", updateError);

      if (nextLogoPath && nextLogoPath !== club.logo_path) {
        const { error: rollbackRemoveError } = await supabase.storage
          .from("club-logos")
          .remove([nextLogoPath]);

        if (rollbackRemoveError) {
          console.error("uploaded logo rollback remove error", rollbackRemoveError);
        }
      }

      return redirectToAdmin(request, { error: "save_failed" });
    }

    if (club.logo_path && club.logo_path !== nextLogoPath) {
      const { error: oldRemoveError } = await supabase.storage
        .from("club-logos")
        .remove([club.logo_path]);

      if (oldRemoveError) {
        console.error("old club logo remove error", oldRemoveError);
      }
    }

    return redirectToAdmin(request, { saved: "1" });
  } catch (error) {
    console.error("POST /api/admin/club failed", error);
    return redirectToAdmin(request, { error: "save_failed" });
  }
}

export async function GET() {
  try {
    const context = await getAdminClubContext();

    if ("error" in context) {
      return NextResponse.json({ error: context.error }, { status: 401 });
    }

    return NextResponse.json({
      club: {
        id: context.club.id,
        display_name: context.club.display_name,
        logo_path: context.club.logo_path,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/club failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}