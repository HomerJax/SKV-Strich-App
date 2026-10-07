import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import {
  buildRoundRobinSchedule,
  buildTimedRoundRobinSchedule,
  calculateTournamentStandings,
  hasUniqueTournamentWinner,
  type TournamentMatch,
  type TournamentTeam,
} from "@/lib/tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionTournamentRow = {
  session_mode: string | null;
  tournament_team_count: number | null;
  tournament_match_minutes: number | null;
  tournament_winner_team_id: number | null;
  tournament_completed_at: string | null;
};

type TeamRow = { id: number; name: string };
type TeamPlayerRow = { team_id: number; player_id: number };
type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  strength: number | null;
  preferred_position: string | null;
};

function playerLabel(player: PlayerRow) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;
  const fullName = [player.first_name?.trim(), player.last_name?.trim()].filter(Boolean).join(" ");
  return fullName || player.name?.trim() || `#${player.id}`;
}

const TOURNAMENT_TEAM_NAME_SETS = [
  ["Wadenbeißer","Rasenotter","Platzhirsche","Flügelstürmer","Grätschenfüchse","Strafraumhaie"],
  ["VARbrecher","Pressingmaschinen","Restverteidigung","Abseits GmbH","Expected Goats","Gegenpressing AG"],
  ["Bierathleten","Hopfenhelden","Kabinenkönige","Durstlöscher","Dritte Halbzeit","Zapfhahn United"],
  ["Alpakattacke","Rasenraketen","Kampfdackel","Turboenten","Flamingo FC","Pausenpandas"],
  ["Tiki Taka Tanten","Grätsch Gatsby","Realitätsverlust","FC Fehlpass","Ballverlust Boys","Lattenkracher"],
  ["Netztester","Pfostenfreunde","Eckfahnenjäger","Kreidefresser","Linienrichter","Tornetzterror"],
  ["Sprintschnecken","Lauflegenden","Tempobolzer","Wadenwunder","Pulsraketen","Sauerstoffdiebe"],
  ["Rote Raketen","Blaue Blitze","Goldene Grätschen","Silberfüchse","Schwarze Panther","Weiße Wölfe"],
  ["Maultaschen Mafia","Spätzle Squad","Kehrwochen Kings","Ländle Legenden","Brezel Boys","Schwabensturm"],
  ["Captain Chaos","Dribbel Doktoren","Professor Pressing","Taktik Titanen","Flanken Forscher","Pass Professoren"],
  ["Rasenrebellen","Bolzplatzbande","Käfigkicker","Straßenzauberer","Pöhler Crew","Kunstschützen"],
  ["Torhungrige","Punktediebe","Seriensieger","Comeback Kids","Underdogs","Favoritenschreck"],
  ["Adler","Wölfe","Füchse","Bären","Haie","Pumas"],
  ["Kobras","Piranhas","Büffel","Raben","Luchse","Hornissen"],
  ["Waschbären","Erdmännchen","Capybaras","Otter","Faultiere","Axolotl"],
  ["Don Promillo","Elfmeter Amigos","Los Grätschos","Torpedo Tiki-Taka","Athletico Bierbauch","Real Sofa"],
  ["FC Feierabend","Montagsmaler","Donnerstagshelden","Wochenendprofis","Überstunden United","Gleitzeit City"],
  ["No Look Pass","One Touch Wonders","Nutmeg Ninjas","Top Bin Boys","Clean Sheet Crew","Golden Goal Gang"],
  ["Pixelkicker","Bug United","Cache Cowboys","Serverstürmer","404 Defense","Deploy Dortmund"],
  ["ChatGPTsch","Prompt Piraten","Token Tigers","Bot Bolzer","KI Kicker","Algorithmus Athletic"],
  ["Mondkicker","Marsmenschen","Saturnstürmer","Kometencrew","Galaxie United","Orbit Rangers"],
  ["Vollspann Vikings","Grätschen Gladiatoren","Pass Piraten","Dribbel Drachen","Flanken Phantome","Tor Titanen"],
  ["Gurkenliga","Kartoffel Kicker","Avocado Athletic","Banana Boys","Kiwi Kickers","Melonen Mafia"],
  ["Espresso Eleven","Cappuccino Crew","Latte Legends","Mokka München","Koffein Kicker","Barista Boys"],
  ["Socken Schützen","Leibchen Legenden","Stutzenstürmer","Schienbein Schurken","Trikot Titanen","Handtuch Heroes"],
  ["Kreisliga Kometen","Bolzplatz Bosse","Kabinen Crew","Duschen Dodgers","Harzhelden","Kunstrasen Kings"],
  ["Panik Pressing","Chaos Kicker","Planlos United","Improvisation FC","Zufallstreffer","Kontrollverlust"],
  ["Feierbiester","Konfetti Kicker","Disco Dribbler","Bass Bolzer","Dancefloor Defense","Afterparty Athletic"],
  ["Ninja Nutmegs","Samurai Strikers","Viking Volley","Spartan Squad","Gladiator Goals","Ritter der Raute"],
  ["Donnerbolzen","Blitzkicker","Sturmtruppe","Wirbelwind","Tornado Team","Orkan Offensive"],
  ["Rasenmäher","Laubbläser","Heckenscheren","Gartenzwerge","Gießkannen","Kompost Kings"],
  ["Döner Dynamo","Pizza Pressing","Schnitzel Squad","Pommes Piraten","Currywurst Crew","Kebab Kicker"],
  ["Kässpätzle Kings","Zwiebelrostbraten","Linsen Legends","Schupfnudel Squad","Flädle Fighters","Knöpfle Kicker"],
  ["Bruddel Brigade","Schaffe Schaffe","Ned Gschimpft","Heiligs Blechle","Noi Net","Ade Athletic"],
  ["Kater Kicker","Restalkohol","Konterbier","Elektrolyte Elf","Aspirin Athletic","Morgenmuffel"],
  ["Rücken United","Knieproblem","Zerrung City","Bandscheiben Boys","Adduktoren Alarm","Wadenkrampf"],
  ["Physio Stammgast","Tape Titans","Eisspray Eleven","Blackroll Boys","Ibu United","Magnesium Mafia"],
  ["Papa Pressing","Elternabend Elf","Kita Kicker","Hausaufgaben FC","Windel United","Spielplatz Squad"],
  ["Rasenrentner","Ü40 Ultras","Oldschool Eleven","Veteranen VAR","Senioren Sprint","Legenden Lounge"],
  ["Keine Kondition","Schwere Beine","Kurze Lunge","Puls 180","Seitenstecher","Letzte Luft"],
  ["Querpass Querulanten","Rückpass Rebellen","Fehlpass Freunde","Ballannahme Boys","Stockfehler Squad","Pressschlag Profis"],
  ["Abstauber","Stolpertore","Kullerball Crew","Eigentor Experten","Pfostenschreck","Lattenliebhaber"],
  ["Tunnel Täter","Hackentrick Heroes","Übersteiger United","Lupfer Legends","Volley Vikings","Fallrückzieher"],
  ["Parkplatz Piraten","Kabinen Chaoten","Duschen United","Schlüssel Vergessen","Leibchenlos","Ballpumpe 04"],
  ["Schiri Blind","VAR Urlaub","Abseits Egal","Hand War Keine","Foul War Ball","Nachspielzeit"],
  ["Montagskick","Dienstag Dynamo","Mittwoch United","Donnerstag Deluxe","Freitag Feierabend","Sonntagsschuss"],
  ["Frühschoppen FC","Stammtisch Stars","Bierdeckel Boys","Theken Titanen","Tresen Truppe","Zapfhahn Zocker"],
  ["Apfelschorle Athletic","Spezi Squad","Cola Kicker","Wasser Warriors","Iso United","Kaffee Crew"],
  ["Kühlschrank Kicker","Airfryer Athletic","Mikrowellen Madrid","Toaster Turin","Backofen Boys","Spülmaschinen City"],
  ["Staubsauger Sturm","Wäschekorb Wanderers","Bügelbrett Boys","Kehrwoche Kicker","Mülltonnen München","Pfandflaschen FC"],
  ["Netflix United","Prime Pressing","Stream Team","Binge Watchers","Fernbedienung FC","Sofa Sporting"],
  ["Office Offside","Excel Eleven","PowerPoint Pressing","Teams Turin","Outlook Athletic","Meeting Madrid"],
  ["SAP Stürmer","Salesforce Squad","Cloud Kicker","Ticket Titans","Workflow Warriors","Release Rangers"],
  ["Merge Konflikt","Git Pushers","Pull Request FC","Main Branch","Commit Crew","Rollback Rangers"],
  ["Null Pointer","Syntax Error","Runtime Rebels","Stack Overflow","Blue Screen Boys","Reboot United"],
  ["WiFi Warriors","Router Rovers","Ping Pirates","LAN Legends","Bluetooth Boys","Hotspot Heroes"],
  ["Emoji Eleven","Meme Madrid","GIF United","Hashtag Heroes","Viral Vikings","Scroll Stopper"],
  ["Influencer Inter","Reels Madrid","Story Squad","Like Leaders","Follower FC","Algorithmus Amigos"],
  ["Montagsmüde","Dienstagsdribbler","Mittwochsmonster","Donnerstagsdurst","Freitagsflieger","Sonntagsschützen"],
  ["Bürohengste","Homeoffice Heroes","Kaffeeküche Crew","Druckerproblem","Jour Fixe FC","Urlaubsantrag"],
  ["Ameisen Army","Hummel Heroes","Käfer Kicker","Libellen Legends","Mücken Madrid","Grashüpfer"],
  ["Pinguin Pressing","Koala Kicker","Känguru Crew","Gorilla Goals","Zebra United","Giraffen Gang"],
  ["Dachs Dynamo","Igel Inter","Marder Madrid","Wildschwein Wien","Reh Rangers","Eichhörnchen Elf"],
  ["T-Rex Tacklers","Raptor Rovers","Triceratops Team","Bronto Boys","Dino Dynamo","Jurassic United"],
  ["Kraken Kicker","Hai Society","Delfin Dynamo","Wal Warriors","Seestern Squad","Oktopus Offensive"],
  ["Yeti United","Bigfoot Boys","Nessie Eleven","Einhorn Elite","Drachen Dynamo","Phönix Pressing"],
  ["Ghost Goals","Zombie Zone","Vampir VAR","Werwolf United","Mumien Madrid","Monster München"],
  ["Superhelden","Sidekick Squad","Cape Crew","Masken Männer","Laser Legends","Krypton Kicker"],
  ["Sheriff Squad","Cowboy Kicker","Saloon Stars","Outlaw Eleven","Rodeo Rangers","Western United"],
  ["Piraten Pressing","Käptn Kicker","Kanonen Crew","Schatzinsel","Freibeuter FC","Rum Rovers"],
  ["Nudel Ninjas","Sushi Strikers","Taco Tacklers","Burger Boys","Falafel FC","Ramen Rangers"],
  ["Knoblauch Kicker","Chili Champions","Zwiebel United","Pfeffer Pressing","Salzstangen Squad","Senf Stars"],
  ["Gummibären","Lakritz Legends","Schoko Squad","Keks Kicker","Bonbon Boys","Marzipan Madrid"],
  ["Eiswürfel Eleven","Softeis Squad","Stracciatella Stars","Pistazien Pressing","Vanille Vikings","Sorbet United"],
  ["Urlaub United","Pool Piraten","Sonnenbrand Squad","Liegestuhl Legends","All Inclusive","Handtuch Reservierer"],
  ["Camping Kicker","Zeltplatz Zocker","Wohnmobil Warriors","Grillgut United","Markisen Madrid","Dosenravioli"],
  ["Autobahn Athletic","Stau Squad","Blitzer Boys","Raststätte Rovers","Ausfahrt Eleven","Kreisverkehr Crew"],
  ["Bahnstreik Boys","Gleiswechsel","Verspätung United","ICE Inter","Regional Rangers","Schienenersatz"],
  ["Flugmodus FC","Gate Gurus","Boarding Boys","Koffer Kicker","Turbulenzen","Duty Free Dynamo"],
  ["Schnee Schützen","Pisten Piraten","Après Athletic","Gondel Gang","Skihasen Squad","Hüttenzauber"],
  ["Sommer Sonne","Hitzefrei FC","Sonnencreme Squad","Freibad Fighters","Grillmeister","Eisdielen Eleven"],
  ["Herbst Heroes","Blätter Boys","Regen Rangers","Matsch Madrid","Windbreaker","Kürbis Kicker"],
  ["Winter Warriors","Glühwein Gang","Schneemann Squad","Eiszapfen Eleven","Frostbeulen","Heizung United"],
  ["Frühling FC","Pollen Pressing","Heuschnupfen","Tulpen Team","Bienen Boys","Sonnenstrahlen"],
  ["Konto Leer","Dispo Dynamo","Payday Pressing","Sparschwein Squad","Kredit Kicker","Cashflow Crew"],
  ["Münzsammler","Scheine Schützen","Kassensturz","Trinkgeld Titans","Pfennigfuchser","Geldregen"],
  ["Rotes Sofa","Grüne Gurken","Blaue Bohnen","Gelbe Säcke","Lila Laune","Orange Offensive"],
  ["Team Vielleicht","Team Mal Sehen","Team Wird Schon","Team Keine Ahnung","Team Passt Scho","Team Läuft"],
  ["Kann Nicht Heute","Bin Gleich Da","Wo Seid Ihr","Noch Im Auto","Hab Verschlafen","Komme Später"],
  ["Nur Ein Spiel","Letztes Bier","Eine Runde Noch","Ganz Locker","Nicht Übertreiben","Morgen Muskelkater"],
  ["Keine Wechsel","Alle Spielen","Einer Fehlt","Wer Ist Tor","Nächster Rein","Zeit Ist Um"],
] as const;

function tournamentTeamNames(teamCount: number) {
  const set = TOURNAMENT_TEAM_NAME_SETS[Math.floor(Math.random() * TOURNAMENT_TEAM_NAME_SETS.length)];
  return Array.from({ length: teamCount }, (_, index) => set[index] ?? `Team ${index + 1}`);
}

function parseIntSafe(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function canManage(access: Awaited<ReturnType<typeof requireSessionAccess>>) {
  if ("error" in access) return false;
  return canManageClub({ isPowerUser: access.isPowerUser, role: access.membership.role });
}

async function loadTournament(access: Exclude<Awaited<ReturnType<typeof requireSessionAccess>>, { error: string }>, sessionId: number) {
  const { adminSupabase, clubId } = access;

  const [
    { data: sessionConfig, error: sessionConfigError },
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    adminSupabase
      .from("sessions")
      .select("session_mode,tournament_team_count,tournament_match_minutes,tournament_winner_team_id,tournament_completed_at")
      .eq("id", sessionId)
      .eq("club_id", clubId)
      .single<SessionTournamentRow>(),
    adminSupabase
      .from("teams")
      .select("id,name")
      .eq("session_id", sessionId)
      .eq("club_id", clubId)
      .order("id", { ascending: true }),
    adminSupabase
      .from("tournament_matches")
      .select("id,game_no,team_a_id,team_b_id,goals_team_a,goals_team_b")
      .eq("session_id", sessionId)
      .eq("club_id", clubId)
      .order("game_no", { ascending: true }),
  ]);

  if (sessionConfigError) throw new Error(sessionConfigError.message);
  if (teamsError) throw new Error(teamsError.message);
  if (matchesError) throw new Error(matchesError.message);

  const teams = (teamsData ?? []) as TeamRow[];
  const teamIds = teams.map((team) => team.id);

  const { data: teamPlayersData, error: teamPlayersError } = teamIds.length
    ? await adminSupabase
        .from("team_players")
        .select("team_id,player_id")
        .in("team_id", teamIds)
    : { data: [] as TeamPlayerRow[], error: null };

  if (teamPlayersError) throw new Error(teamPlayersError.message);

  const playerIds = Array.from(
    new Set(((teamPlayersData ?? []) as TeamPlayerRow[]).map((row) => row.player_id)),
  );

  const { data: playersData, error: playersError } = playerIds.length
    ? await adminSupabase
        .from("players")
        .select("id,name,first_name,last_name,nickname,strength,preferred_position")
        .eq("club_id", clubId)
        .in("id", playerIds)
    : { data: [] as PlayerRow[], error: null };

  if (playersError) throw new Error(playersError.message);

  const playerById = new Map(((playersData ?? []) as PlayerRow[]).map((player) => [player.id, player]));
  const membersByTeam = new Map<number, Array<{ id: number; name: string; strength: number | null; preferredPosition: string | null }>>();

  for (const row of (teamPlayersData ?? []) as TeamPlayerRow[]) {
    const player = playerById.get(row.player_id);
    if (!player) continue;
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push({
      id: player.id,
      name: playerLabel(player),
      strength: player.strength,
      preferredPosition: player.preferred_position,
    });
    membersByTeam.set(row.team_id, list);
  }

  const tournamentTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    players: (membersByTeam.get(team.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));

  const matches = (matchesData ?? []) as TournamentMatch[];
  const standings = calculateTournamentStandings(teams as TournamentTeam[], matches);

  return {
    config: sessionConfig,
    teams: tournamentTeams,
    matches,
    standings,
  };
}

async function replaceTournamentTeams(
  access: Exclude<Awaited<ReturnType<typeof requireSessionAccess>>, { error: string }>,
  sessionId: number,
  teamCount: number,
  rounds: number,
  gameCount?: number,
) {
  const { adminSupabase, clubId } = access;

  const { data: presentData, error: presentError } = await adminSupabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (presentError) throw new Error(presentError.message);

  const presentIds = (presentData ?? [])
    .map((row) => Number(row.player_id))
    .filter((id) => Number.isFinite(id));

  if (presentIds.length < teamCount * 2) {
    throw new Error(`Für ${teamCount} Teams sollten mindestens ${teamCount * 2} Spieler anwesend sein.`);
  }

  const { data: playersData, error: playersError } = await adminSupabase
    .from("players")
    .select("id,name,first_name,last_name,nickname,strength,preferred_position")
    .eq("club_id", clubId)
    .in("id", presentIds);

  if (playersError) throw new Error(playersError.message);

  const players = ((playersData ?? []) as PlayerRow[]).sort((a, b) => {
    const sa = a.strength ?? 3;
    const sb = b.strength ?? 3;
    if (sb !== sa) return sb - sa;
    return playerLabel(a).localeCompare(playerLabel(b), "de");
  });

  const { data: oldTeamsData, error: oldTeamsError } = await adminSupabase
    .from("teams")
    .select("id")
    .eq("session_id", sessionId)
    .eq("club_id", clubId);

  if (oldTeamsError) throw new Error(oldTeamsError.message);
  const oldTeamIds = (oldTeamsData ?? []).map((team) => Number(team.id)).filter(Number.isFinite);

  if (oldTeamIds.length) {
    const { error: deleteAssignmentsError } = await adminSupabase
      .from("team_players")
      .delete()
      .in("team_id", oldTeamIds);
    if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);

    const { error: deleteTeamsError } = await adminSupabase
      .from("teams")
      .delete()
      .in("id", oldTeamIds);
    if (deleteTeamsError) throw new Error(deleteTeamsError.message);
  }

  const generatedTeamNames = tournamentTeamNames(teamCount);

  const { data: createdTeamsData, error: createdTeamsError } = await adminSupabase
    .from("teams")
    .insert(
      Array.from({ length: teamCount }, (_, index) => ({
        session_id: sessionId,
        club_id: clubId,
        name: generatedTeamNames[index],
      })),
    )
    .select("id,name");

  if (createdTeamsError) throw new Error(createdTeamsError.message);
  const createdTeams = (createdTeamsData ?? []) as TeamRow[];

  const buckets = createdTeams.map((team) => ({
    team,
    players: [] as PlayerRow[],
    strength: 0,
    keepers: 0,
  }));

  for (const player of players) {
    const sortedBuckets = [...buckets].sort((a, b) => {
      const countDiff = a.players.length - b.players.length;
      if (countDiff !== 0) return countDiff;
      const strengthDiff = a.strength - b.strength;
      if (strengthDiff !== 0) return strengthDiff;
      if (player.preferred_position === "goalkeeper") {
        const keeperDiff = a.keepers - b.keepers;
        if (keeperDiff !== 0) return keeperDiff;
      }
      return a.team.id - b.team.id;
    });

    const target = sortedBuckets[0];
    target.players.push(player);
    target.strength += player.strength ?? 3;
    if (player.preferred_position === "goalkeeper") target.keepers += 1;
  }

  const assignments = buckets.flatMap((bucket) =>
    bucket.players.map((player) => ({
      team_id: bucket.team.id,
      player_id: player.id,
    })),
  );

  const { error: assignmentError } = await adminSupabase
    .from("team_players")
    .insert(assignments);

  if (assignmentError) throw new Error(assignmentError.message);

  const teamIds = createdTeams.map((team) => team.id);
  const fixtures = gameCount ? buildTimedRoundRobinSchedule(teamIds, gameCount) : buildRoundRobinSchedule(teamIds, rounds);
  if (fixtures.length) {
    const { error: fixtureError } = await adminSupabase
      .from("tournament_matches")
      .insert(
        fixtures.map((fixture) => ({
          ...fixture,
          club_id: clubId,
          session_id: sessionId,
          goals_team_a: null,
          goals_team_b: null,
        })),
      );
    if (fixtureError) throw new Error(fixtureError.message);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session." }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const tournament = await loadTournament(access, sessionId);
    return NextResponse.json({ ok: true, ...tournament });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turnier konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session." }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!canManage(access)) {
    return NextResponse.json({ error: "Nur Admins können den Turniermodus verwalten." }, { status: 403 });
  }

  if (access.session.type === "event") {
    return NextResponse.json({ error: "Der Turniermodus ist nur für Trainings verfügbar." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const intent = String(payload.intent ?? "");

  try {
    if (intent === "setup" || intent === "regenerate") {
      const teamCount = Math.max(2, Math.min(6, parseIntSafe(payload.teamCount, 3)));
      const matchMinutes = Math.max(1, Math.min(60, parseIntSafe(payload.matchMinutes, 8)));
      const rounds = Math.max(1, Math.min(12, parseIntSafe(payload.rounds, 2)));\n      const gameCount = Math.max(0, Math.min(200, parseIntSafe(payload.gameCount, 0)));

      const { data: existingResults, error: existingResultsError } = await access.adminSupabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .limit(1);

      if (existingResultsError) throw new Error(existingResultsError.message);
      if ((existingResults ?? []).length > 0) {
        return NextResponse.json(
          { error: "Für diese Session ist bereits ein Ergebnis gespeichert. Vor dem Wechsel bitte das Ergebnis löschen." },
          { status: 409 },
        );
      }

      const { error: clearMatchesError } = await access.adminSupabase
        .from("tournament_matches")
        .delete()
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId);

      if (clearMatchesError) throw new Error(clearMatchesError.message);

      await replaceTournamentTeams(access, sessionId, teamCount, rounds, gameCount || undefined);

      const { error: sessionUpdateError } = await access.adminSupabase
        .from("sessions")
        .update({
          session_mode: "tournament",
          tournament_team_count: teamCount,
          tournament_match_minutes: matchMinutes,
          tournament_winner_team_id: null,
          tournament_completed_at: null,
          winner_photo_path: null,
        })
        .eq("id", sessionId)
        .eq("club_id", access.clubId);

      if (sessionUpdateError) throw new Error(sessionUpdateError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: "Turnier wurde vorbereitet.", ...tournament });
    }

    if (intent === "reset") {
      const { data: tournamentTeams, error: teamsError } = await access.adminSupabase
        .from("teams").select("id").eq("session_id", sessionId).eq("club_id", access.clubId);
      if (teamsError) throw new Error(teamsError.message);
      const teamIds = (tournamentTeams ?? []).map((team) => Number(team.id)).filter(Number.isFinite);

      const { error: matchesError } = await access.adminSupabase
        .from("tournament_matches").delete().eq("session_id", sessionId).eq("club_id", access.clubId);
      if (matchesError) throw new Error(matchesError.message);

      if (teamIds.length) {
        const { error: assignmentsError } = await access.adminSupabase.from("team_players").delete().in("team_id", teamIds);
        if (assignmentsError) throw new Error(assignmentsError.message);
        const { error: deleteTeamsError } = await access.adminSupabase.from("teams").delete().in("id", teamIds);
        if (deleteTeamsError) throw new Error(deleteTeamsError.message);
      }

      if (access.session.tournament_completed_at) {
        const { error: resultError } = await access.adminSupabase.from("results").delete().eq("session_id", sessionId);
        if (resultError) throw new Error(resultError.message);
      }

      const { error: resetError } = await access.adminSupabase.from("sessions").update({
        session_mode: "normal",
        tournament_team_count: null,
        tournament_match_minutes: null,
        tournament_winner_team_id: null,
        tournament_completed_at: null,
        winner_photo_path: null,
      }).eq("id", sessionId).eq("club_id", access.clubId);
      if (resetError) throw new Error(resetError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: "Turnier wurde zurückgesetzt.", ...tournament });
    }

    if (intent === "rename_team") {
      const teamId = parseIntSafe(payload.teamId, 0);
      const name = String(payload.name ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      if (teamId < 1 || !name) {
        return NextResponse.json({ error: "Bitte einen gültigen Teamnamen eingeben." }, { status: 400 });
      }
      const { data: team, error: teamError } = await access.adminSupabase
        .from("teams")
        .select("id")
        .eq("id", teamId)
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId)
        .maybeSingle<{ id: number }>();
      if (teamError) throw new Error(teamError.message);
      if (!team) return NextResponse.json({ error: "Team nicht gefunden." }, { status: 404 });

      const { error: renameError } = await access.adminSupabase
        .from("teams")
        .update({ name })
        .eq("id", teamId)
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId);
      if (renameError) throw new Error(renameError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: "Teamname gespeichert.", ...tournament });
    }

    if (intent === "save_match") {
      const gameNo = parseIntSafe(payload.gameNo, 0);
      const goalsA = parseIntSafe(payload.goalsA, -1);
      const goalsB = parseIntSafe(payload.goalsB, -1);

      if (gameNo < 1 || goalsA < 0 || goalsB < 0) {
        return NextResponse.json({ error: "Bitte ein gültiges Ergebnis eingeben." }, { status: 400 });
      }

      const { data: config, error: configError } = await access.adminSupabase
        .from("sessions")
        .select("session_mode,tournament_completed_at")
        .eq("id", sessionId)
        .eq("club_id", access.clubId)
        .single<{ session_mode: string | null; tournament_completed_at: string | null }>();

      if (configError) throw new Error(configError.message);
      if (config.session_mode !== "tournament") {
        return NextResponse.json({ error: "Diese Session ist nicht im Turniermodus." }, { status: 409 });
      }
      if (config.tournament_completed_at) {
        return NextResponse.json({ error: "Das Turnier ist bereits abgeschlossen." }, { status: 409 });
      }

      const { error: matchUpdateError } = await access.adminSupabase
        .from("tournament_matches")
        .update({
          goals_team_a: goalsA,
          goals_team_b: goalsB,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId)
        .eq("game_no", gameNo);

      if (matchUpdateError) throw new Error(matchUpdateError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: `Spiel ${gameNo} gespeichert.`, ...tournament });
    }

    if (intent === "finalize") {
      const tournament = await loadTournament(access, sessionId);
      const incomplete = tournament.matches.some(
        (match) => match.goals_team_a == null || match.goals_team_b == null,
      );

      if (incomplete || tournament.matches.length === 0) {
        return NextResponse.json({ error: "Bitte zuerst alle Turnierspiele abschließen." }, { status: 409 });
      }

      if (!hasUniqueTournamentWinner(tournament.standings)) {
        return NextResponse.json(
          { error: "Noch kein eindeutiger Turniersieger. Punkte, Tordifferenz und erzielte Tore sind gleich." },
          { status: 409 },
        );
      }

      const winner = tournament.standings[0];
      const runnerUp = tournament.standings[1];

      const { error: deleteResultError } = await access.adminSupabase
        .from("results")
        .delete()
        .eq("session_id", sessionId);
      if (deleteResultError) throw new Error(deleteResultError.message);

      const { error: resultError } = await access.adminSupabase
        .from("results")
        .insert({
          session_id: sessionId,
          club_id: access.clubId,
          game_no: 1,
          team_a_id: winner.teamId,
          team_b_id: runnerUp.teamId,
          goals_team_a: 1,
          goals_team_b: 0,
        });
      if (resultError) throw new Error(resultError.message);

      const { error: finalizeError } = await access.adminSupabase
        .from("sessions")
        .update({
          tournament_winner_team_id: winner.teamId,
          tournament_completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("club_id", access.clubId);
      if (finalizeError) throw new Error(finalizeError.message);

      const finalized = await loadTournament(access, sessionId);
      return NextResponse.json({
        ok: true,
        message: `${winner.teamName} gewinnt das Turnier. Für die Karriere zählt genau ein Session-Sieg.`,
        ...finalized,
      });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turnier-Aktion fehlgeschlagen." },
      { status: 500 },
    );
  }
}
