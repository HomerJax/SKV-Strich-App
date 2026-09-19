import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getPlayerDisplayName } from "@/lib/player-display";
import PlayerPhotoUpload from "@/components/PlayerPhotoUpload";

type Props = { params: Promise<{ id: string }>; searchParams?: Promise<{ saved?: string; error?: string }> };
type PlayerPass = {
  id: number; club_id: string; user_id: string | null; name: string | null;
  first_name: string | null; last_name: string | null; nickname: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  birth_date: string | null; jersey_number: string | null; photo_path: string | null;
  photo_position_x: number | null; photo_position_y: number | null; photo_zoom: number | null;
  created_at: string | null;
};

function positionLabel(value: PlayerPass["preferred_position"]) {
  if (value === "goalkeeper") return "Torwart";
  if (value === "defense") return "Hinten";
  if (value === "attack") return "Mittelfeld/Vorne";
  return "—";
}
function dateLabel(value: string | null) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString("de-DE") : "—"; }

export default async function PlayerPassPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) notFound();
  const { clubId, player: ownPlayer, membership, isPowerUser } = await requireClub();
  const supabase = await createClient();
  const [{ data }, { data: club }] = await Promise.all([
    supabase.from("players").select("id, club_id, user_id, name, first_name, last_name, nickname, preferred_position, birth_date, jersey_number, photo_path, photo_position_x, photo_position_y, photo_zoom, created_at").eq("club_id", clubId).eq("id", playerId).maybeSingle(),
    supabase.from("clubs").select("display_name").eq("id", clubId).maybeSingle(),
  ]);
  const pass = data as PlayerPass | null;
  if (!pass) notFound();
  const canEdit = ownPlayer?.id === pass.id || canManageClub({ isPowerUser, role: membership.role });
  const displayName = getPlayerDisplayName(pass);
  const photoUrl = pass.photo_path ? supabase.storage.from("player-photos").getPublicUrl(pass.photo_path).data.publicUrl : null;
  const photoStyle = { objectPosition:`${pass.photo_position_x ?? 50}% ${pass.photo_position_y ?? 50}%`, transform:`scale(${Number(pass.photo_zoom ?? 1)})`, transformOrigin:`${pass.photo_position_x ?? 50}% ${pass.photo_position_y ?? 50}%` };
  const photo = photoUrl ? <Image src={photoUrl} alt={displayName} width={300} height={375} unoptimized className="h-full w-full object-cover" style={photoStyle}/> : <div className="flex h-full items-center justify-center text-5xl font-black text-slate-400">{displayName.slice(0,1).toUpperCase()}</div>;

  return <main className="min-h-screen bg-neutral-100 px-4 py-5">
    <section className="mx-auto max-w-2xl space-y-4">
      <Link href="/players" className="text-sm font-semibold text-slate-600">← Kader</Link>
      {query?.saved === "1" ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Spielerpass gespeichert.</div> : null}
      {query?.error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Spielerpass konnte nicht gespeichert werden.</div> : null}

      <div className="overflow-hidden rounded-[26px] border border-slate-300 bg-[#f6f0d8] shadow-sm">
        <div className="border-b border-slate-300 bg-white/60 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div><div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">strikr</div><h1 className="text-xl font-black tracking-tight text-slate-950">Spielerpass</h1></div>
            <div className="text-right text-[10px] font-mono text-slate-500">PASS-NR.<br/><span className="text-sm font-bold text-slate-800">STR-{String(pass.id).padStart(5,"0")}</span></div>
          </div>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_150px]">
          <div className="order-2 space-y-3 text-sm sm:order-1">
            <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</div><div className="text-xl font-black text-slate-950">{displayName}</div></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-300 pt-3">
              <div><div className="text-[10px] uppercase text-slate-500">Geboren</div><b>{dateLabel(pass.birth_date)}</b></div>
              <div><div className="text-[10px] uppercase text-slate-500">Rückennummer</div><b>{pass.jersey_number || "—"}</b></div>
              <div><div className="text-[10px] uppercase text-slate-500">Position</div><b>{positionLabel(pass.preferred_position)}</b></div>
              <div><div className="text-[10px] uppercase text-slate-500">Verein</div><b>{club?.display_name || "strikr Club"}</b></div>
            </div>
            <div className="pt-4 text-[10px] uppercase tracking-[0.18em] text-slate-400">Digitaler Spielerpass · strikr</div>
          </div>
          <div className="order-1 sm:order-2">
            {canEdit ? <PlayerPhotoUpload playerId={pass.id} birthDate={pass.birth_date} jerseyNumber={pass.jersey_number} photoUrl={photoUrl} initialPositionX={pass.photo_position_x} initialPositionY={pass.photo_position_y} initialZoom={pass.photo_zoom} className="aspect-[4/5] overflow-hidden border-2 border-white bg-slate-200 shadow-md">{photo}</PlayerPhotoUpload> : <div className="aspect-[4/5] overflow-hidden border-2 border-white bg-slate-200 shadow-md">{photo}</div>}
          </div>
        </div>
      </div>

      {canEdit ? <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-950">Spielerpass pflegen</h2>
        <p className="mt-1 text-xs text-slate-500">Geburtstag wird später auch für eure Mannschaftskasse genutzt. Stärke und Statistiken gehören bewusst nicht in den Spielerpass.</p>
        <form action="/api/player-pass" method="post" encType="multipart/form-data" className="mt-4 space-y-4">
          <input type="hidden" name="player_id" value={pass.id}/>
          <input type="hidden" name="photo_position_x" value={pass.photo_position_x ?? 50}/>
          <input type="hidden" name="photo_position_y" value={pass.photo_position_y ?? 50}/>
          <input type="hidden" name="photo_zoom" value={pass.photo_zoom ?? 1}/>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Geburtsdatum<input type="date" name="birth_date" defaultValue={pass.birth_date ?? ""} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
            <label className="text-sm font-medium">Rückennummer<input name="jersey_number" maxLength={8} defaultValue={pass.jersey_number ?? ""} placeholder="z. B. 8" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label>
          </div>
          <p className="text-xs text-slate-500">Foto direkt oben im Spielerpass ändern und anschließend ausrichten.</p>
          <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Spielerpass speichern</button>
        </form>
      </div> : null}
      <div className="flex gap-2"><Link href="/stats" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Meine Stats →</Link><Link href={`/badges?player=${pass.id}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Hall of Fame →</Link></div>
    </section>
  </main>;
}
