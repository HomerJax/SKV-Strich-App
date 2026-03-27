import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type AdminClubContext =
  | { club: ClubRow }
  | {
      error:
        | "unauthorized"
        | "missing_club"
        | "select_club"
        | "login"
        | "onboarding";
    };

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_COLORS = new Set(["black", "blue", "red", "green"]);

function safeFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getRequestOrigin(request: NextRequest) {
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? "https";
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const proto = host.includes("localhost") ? "http" : forwardedProto;
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}

function redirectToPath(
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>
) {
  const url = new URL(pathname, getRequestOrigin(request));

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(url, { status: 303 });
}

function redirectToClubAdmin(
  request: NextRequest,
  params?: Record<string, string>
) {
  return redirectToPath(request, "/admin/club", params);
}

function getSupabaseServiceClient() {
  return createServiceClient(
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

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    typeof value !== "string" &&
    value !== null &&
    typeof value.name === "string" &&
    typeof value.size === "number"
  );
}

async function getAdminClubContext(): Promise<AdminClubContext> {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    return { error: "login" };
  }

  if (!ctx.player) {
    return { error: "onboarding" };
  }

  if (!ctx.memberships.length || !ctx.activeClubId) {
    return { error: "select_club" };
  }

  const membership =
    ctx.memberships.find((m) => m.club_id === ctx.activeClubId) ?? null;

  if (!membership || !isAdminRole(membership.role)) {
    return { error: "unauthorized" };
  }

  const supabase = await createClient();

  const { data: clubData, error: clubError } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path, primary_color")
    .eq("id", ctx.activeClubId)
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

export async function POST(request: NextRequest) {
  try {
    const context = await getAdminClubContext();

    if ("error" in context) {
      if (context.error === "login") {
        return redirectToPath(request, AUTH_ROUTES.login);
      }

      if (context.error === "onboarding") {
        return redirectToPath(request, AUTH_ROUTES.onboarding);
      }

      if (context.error === "select_club") {
        return redirectToPath(request, AUTH_ROUTES.selectClub);
      }

      if (context.error === "missing_club") {
        return redirectToClubAdmin(request, { error: "missing_club" });
      }

      return redirectToClubAdmin(request, { error: "unauthorized" });
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
        return redirectToClubAdmin(request, { error: "remove_failed" });
      }

      return redirectToClubAdmin(request, { saved: "1" });
    }

    const rawDisplayName = formData.get("display_name");
    const displayName =
      typeof rawDisplayName === "string" ? rawDisplayName.trim() : "";

    const rawPrimaryColor = formData.get("primary_color");
    const primaryColor =
      typeof rawPrimaryColor === "string" && ALLOWED_COLORS.has(rawPrimaryColor)
        ? rawPrimaryColor
        : "black";

    const logoEntry = formData.get("logo");
    let nextLogoPath = club.logo_path;

    if (
      isUploadedFile(logoEntry) &&
      logoEntry.size > 0 &&
      logoEntry.name.trim()
    ) {
      const file = logoEntry;

      if (!ALLOWED_TYPES.includes(file.type)) {
        return redirectToClubAdmin(request, { error: "invalid_file" });
      }

      if (file.size > MAX_FILE_SIZE) {
        return redirectToClubAdmin(request, { error: "file_too_large" });
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
        return redirectToClubAdmin(request, { error: "save_failed" });
      }

      nextLogoPath = filePath;
    }

    const { error: updateError } = await supabase
      .from("clubs")
      .update({
        display_name: displayName || null,
        logo_path: nextLogoPath,
        primary_color: primaryColor,
      })
      .eq("id", club.id);

    if (updateError) {
      console.error("club update error", updateError);

      if (nextLogoPath && nextLogoPath !== club.logo_path) {
        const { error: rollbackRemoveError } = await supabase.storage
          .from("club-logos")
          .remove([nextLogoPath]);

        if (rollbackRemoveError) {
          console.error(
            "uploaded logo rollback remove error",
            rollbackRemoveError
          );
        }
      }

      return redirectToClubAdmin(request, { error: "save_failed" });
    }

    if (club.logo_path && club.logo_path !== nextLogoPath) {
      const { error: oldRemoveError } = await supabase.storage
        .from("club-logos")
        .remove([club.logo_path]);

      if (oldRemoveError) {
        console.error("old club logo remove error", oldRemoveError);
      }
    }

    return redirectToClubAdmin(request, { saved: "1" });
  } catch (error) {
    console.error("POST /api/admin/club failed", error);
    return redirectToClubAdmin(request, { error: "save_failed" });
  }
}

export async function GET() {
  try {
    const context = await getAdminClubContext();

    if ("error" in context) {
      const status =
        context.error === "missing_club" || context.error === "select_club"
          ? 400
          : context.error === "login"
            ? 401
            : 403;

      return NextResponse.json({ error: context.error }, { status });
    }

    return NextResponse.json({
      club: {
        id: context.club.id,
        display_name: context.club.display_name,
        logo_path: context.club.logo_path,
        primary_color: context.club.primary_color,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/club failed", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}