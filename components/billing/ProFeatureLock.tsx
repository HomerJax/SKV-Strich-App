type ProFeatureLockProps = {
  clubName?: string | null;
  title?: string;
  description?: string;
  featureList?: string[];
  compact?: boolean;
};

function buildWhatsAppHref(clubName?: string | null) {
  const teamName = clubName?.trim() || "unser Team";

  const text = [
    "Hi, wir möchten strikr Pro freischalten.",
    "",
    `Team: ${teamName}`,
    "",
    "Bitte schick mir kurz die Infos zum Supercup-Angebot.",
  ].join("\n");

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function ProFeatureLock({
  clubName,
  title = "Mit strikr Pro freischalten",
  description = "Dieses Feature ist in Free sichtbar, aber erst mit Pro nutzbar.",
  featureList = [],
  compact = false,
}: ProFeatureLockProps) {
  const whatsappHref = buildWhatsAppHref(clubName);

  return (
    <div
      className={`rounded-[24px] border border-slate-200 bg-white shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
        strikr Pro
      </div>

      <h3 className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      {featureList.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {featureList.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white">
                ✓
              </span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Pro per WhatsApp anfragen
        </a>

        <a
          href={`mailto:hello@strikr.team?subject=${encodeURIComponent(
            "strikr Pro Anfrage"
          )}&body=${encodeURIComponent(
            `Hi, wir möchten strikr Pro freischalten.\n\nTeam: ${
              clubName?.trim() || "unser Team"
            }\n\nBitte schick mir kurz die Infos zum Supercup-Angebot.`
          )}`}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
        >
          Per E-Mail anfragen
        </a>
      </div>
    </div>
  );
}