import { LineupShareData, SharePlayer } from "@/lib/share/types";
import { trimName } from "@/lib/share/utils";
import { SHARE_THEME } from "@/lib/share/brand";

function padPlayers(players: SharePlayer[], maxPlayers: number) {
  const padded = [...players];

  while (padded.length < maxPlayers) {
    padded.push({
      id: `empty-${padded.length}`,
      name: " ",
    });
  }

  return padded;
}

export default function LineupShareCard({
  data,
}: {
  data: LineupShareData;
}) {
  const maxPlayers = Math.max(data.teamA.players.length, data.teamB.players.length);
  const teamAPlayers = padPlayers(data.teamA.players, maxPlayers);
  const teamBPlayers = padPlayers(data.teamB.players, maxPlayers);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 34,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          textAlign: "left",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 66,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-1.4px",
          }}
        >
          {data.title}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 30,
              color: SHARE_THEME.text,
              opacity: 0.9,
            }}
          >
            {data.date}
          </div>

          <div
            style={{
              fontSize: 22,
              color: SHARE_THEME.muted,
            }}
          >
            {data.subtitle}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 28,
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: SHARE_THEME.card,
            border: `1px solid ${SHARE_THEME.cardBorder}`,
            borderRadius: 30,
            padding: 30,
            minHeight: 760,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginBottom: 22,
            }}
          >
            {data.teamA.name}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {teamAPlayers.map((player, index) => (
              <div
                key={player.id || `team-a-row-${index}`}
                style={{
                  fontSize: 28,
                  padding: "10px 0",
                  minHeight: 34,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  opacity: player.name.trim().length === 0 ? 0.35 : 1,
                }}
              >
                {player.name.trim().length === 0 ? " " : trimName(player.name, 24)}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: "2px",
            opacity: 0.24,
          }}
        >
          VS
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: SHARE_THEME.card,
            border: `1px solid ${SHARE_THEME.cardBorder}`,
            borderRadius: 30,
            padding: 30,
            minHeight: 760,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginBottom: 22,
            }}
          >
            {data.teamB.name}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {teamBPlayers.map((player, index) => (
              <div
                key={player.id || `team-b-row-${index}`}
                style={{
                  fontSize: 28,
                  padding: "10px 0",
                  minHeight: 34,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  opacity: player.name.trim().length === 0 ? 0.35 : 1,
                }}
              >
                {player.name.trim().length === 0 ? " " : trimName(player.name, 24)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}