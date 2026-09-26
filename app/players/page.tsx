import Link from "next/link";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { PublicPlayer } from "@/lib/types/player";
import { getPlayerDisplayName } from "@/lib/player-display";
import { getServerI18n } from "@/lib/i18n/server";

type PlayerListItem = PublicPlayer & { first_name?: string | null; last_name?: string | null; nickname?: string | null; };
function sortPlayersByDisplayName(players: PlayerListItem[], locale: "de" | "en") { return [...players].sort((a,b)=>getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), locale === "de" ? "de" : "en")); }

export default async function PlayersPage() {
  const { locale, t } = await getServerI18n();
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_players_public");
  const players = sortPlayersByDisplayName(((data ?? []) as PlayerListItem[]).filter(p=>p.is_active!==false), locale);
  return <div className="space-y-4">
    <div><Link href="/" className="text-xs text-slate-500 hover:text-slate-700">← {t("players.backHome")}</Link></div>
    <div className="flex items-center justify-between gap-2"><div><h1 className="text-lg font-semibold text-slate-900">{t("players.title")}</h1><p className="text-xs text-slate-500">{t("players.rosterHint")}</p></div><Link href="/players/new" className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-slate-50">{t("players.add")}</Link></div>
    {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{t("players.loadFailed", { error: error.message })}</div> : null}
    {!error && players.length===0 ? <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">{t("players.empty")}</div> : null}
    {!error && players.length>0 ? <ul className="space-y-2">{players.map(player=><li key={player.id}><Link href={`/players/${player.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-slate-400"><div><div className="font-semibold text-slate-900">{getPlayerDisplayName(player)}</div><div className="text-[11px] text-slate-500">{player.age_group ?? "?"} · {player.preferred_position === "defense"
  ? t("players.positionDefense")
  : player.preferred_position === "attack"
    ? t("players.positionAttack")
    : player.preferred_position === "goalkeeper"
      ? t("players.positionGoalkeeper")
      : t("players.positionOpen")}</div></div><div className="text-xs font-semibold text-slate-500">{t("players.passLink")}</div></Link></li>)}</ul> : null}
  </div>;
}
