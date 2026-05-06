import Link from "next/link";

type MvpNotificationPayload = {
  sessionId: number;
  winnerName: string;
  isWinner: boolean;
  shareVariant: "winner" | "team";
  shareImageUrl: string;
  sessionHref: string;
};

type MvpNotificationCardProps = {
  title: string;
  body: string | null;
  ctaHref: string;
  payload: MvpNotificationPayload;
};

export default function MvpNotificationCard({
  title,
  body,
  ctaHref,
  payload,
}: MvpNotificationCardProps) {
  const ctaLabel = payload.isWinner ? "Teilen" : "Ergebnis ansehen";

  return (
    <Link
      href={ctaHref}
      className="block overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 text-white shadow-xl"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={payload.shareImageUrl}
          alt={payload.isWinner ? "MVP Share Card" : "MVP Ergebnis Card"}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold tracking-tight">{title}</p>
          {body ? (
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">{body}</p>
          ) : null}
        </div>

        <div className="inline-flex rounded-full bg-white px-4 py-2 text-xs font-bold text-black">
          {ctaLabel}
        </div>
      </div>
    </Link>
  );
}