type SessionType = "training" | "event";

type SessionTypeNoticeProps = {
  type: SessionType;
};

export default function SessionTypeNotice({ type }: SessionTypeNoticeProps) {
  if (type === "training") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        Diese Session läuft als <span className="font-semibold">Training</span>.
        Teams, Ergebnis, MVP und Trainingswertung bleiben aktiv.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      Diese Session läuft als <span className="font-semibold">Spiel / Termin</span>.
      Sie soll nicht wie ein normales Training behandelt werden und kann aus Trainings-Logik,
      MVP und Wertung herausgenommen werden.
    </div>
  );
}