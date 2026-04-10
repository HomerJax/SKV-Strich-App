import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

export default async function ClubSettingsCard() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, display_name, logo_path, primary_color")
    .eq("id", clubId)
    .maybeSingle();

  let logoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    logoUrl = data.publicUrl;
  }

  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm space-y-5">

      <h2 className="text-xl font-bold">Club & Branding</h2>

      {logoUrl && (
        <Image
          src={logoUrl}
          alt="Logo"
          width={80}
          height={80}
          className="rounded-xl border"
        />
      )}

      <form
        method="post"
        action="/api/admin/club"
        encType="multipart/form-data"
        className="space-y-4"
      >
        <input
          name="display_name"
          defaultValue={club?.display_name ?? ""}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
        />

        <input type="file" name="logo" />

        <button className="rounded-xl bg-black text-white px-4 py-2 text-sm font-semibold">
          Speichern
        </button>
      </form>

    </div>
  );
}