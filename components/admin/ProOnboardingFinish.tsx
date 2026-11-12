import Link from "next/link";
import { Check, Crown, Info, ShieldCheck, Sparkles } from "lucide-react";
import type { BillingAccess } from "@/lib/billing/club-billing";
import { PRO_TRIAL_DAYS } from "@/lib/billing/pro-trial";
import { INTRO_PRICING } from "@/lib/billing/pricing";
import { FREE_ACTIVE_CATEGORY_LIMIT, FREE_FIXED_PLAYER_LIMIT } from "@/lib/billing/product-limits";

type Props = {
  billing: BillingAccess;
  preview: boolean;
  trialAvailableForNewClubs: boolean;
};

function formatEndDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(date);
}

/** Read-only overview. The only payment entry point remains the dedicated /pro page. */
export default function ProOnboardingFinish({ billing, preview, trialAvailableForNewClubs }: Props) {
  const simulatedTrial = preview && trialAvailableForNewClubs;
  const isTrial = preview ? simulatedTrial : billing.isTrial;
  const isPro = preview ? simulatedTrial : billing.isPro;
  const isPaidOrFounderPro = !preview && billing.isPro && !billing.isTrial;
  const wasTrial = !preview && billing.billing.plan_key === "pro_trial" && !billing.isTrial;
  const trialEnd = !preview && billing.isTrial ? formatEndDate(billing.billing.trial_ends_at) : null;
  const paidEnd = isPaidOrFounderPro && billing.billing.cancel_at_period_end
    ? formatEndDate(billing.billing.pro_ends_at) : null;

  const status = isTrial
    ? (preview ? "Beispiel: PRO-Testphase" : "PRO-Testphase ist aktiv")
    : isPaidOrFounderPro ? "PRO ist bereits aktiv"
    : wasTrial ? "PRO-Testphase beendet · Free aktiv"
    : "Free ist aktiv";

  return (
    <div className="min-w-0 space-y-4">
      <section className="relative overflow-hidden rounded-[24px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.17em] text-violet-700">
          <Sparkles className="h-4 w-4" /> Fast geschafft
        </div>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Euer Verein kann starten!</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Zum Abschluss zeigen wir euch euren Tarif. Die wichtigsten Funktionen zum Organisieren, Einladen und Spielen sind auch mit Free nutzbar.
        </p>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-white p-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-violet-700">
            <Crown className="h-4 w-4" /> {preview ? "Simulierter Tarif" : "Euer aktueller Tarif"}
          </div>
          <p className="mt-2 text-lg font-black text-slate-950">{status}</p>
          {isTrial ? (
            <>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                {preview
                  ? `Neue Vereine erhalten bei aktivierter Testphase ${PRO_TRIAL_DAYS} Tage PRO – ohne Kreditkarte und ohne automatische Verlängerung.`
                  : `Ihr könnt PRO kostenlos nutzen${trialEnd ? ` bis ${trialEnd}` : ""}. Ohne Kreditkarte und ohne automatische Verlängerung.`}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Danach geht es automatisch mit Free weiter, wenn ihr kein kostenpflichtiges PRO-Abo abschließt. Eure Vereinsdaten bleiben bestehen.
              </p>
            </>
          ) : isPaidOrFounderPro ? (
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {billing.isFounder
                ? "Euer Verein hat Founder PRO. Ihr müsst hier nichts abschließen."
                : paidEnd
                  ? `Euer PRO-Abo ist noch bis ${paidEnd} aktiv. Die Kündigung zum Periodenende ist vorgemerkt.`
                  : `Euer Verein nutzt bereits ${billing.planLabel}. Ihr müsst hier nichts neu buchen.`}
            </p>
          ) : (
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {wasTrial
                ? "Euer kostenloser PRO-Test ist abgelaufen. Ihr könnt mit Free ganz normal weitermachen – ohne automatische Kosten."
                : "Ihr könnt sofort kostenlos loslegen. PRO ist ein freiwilliges Upgrade; hier wird kein Abo gestartet."}
            </p>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-black text-slate-950">Free reicht für den Start. PRO bietet mehr.</h3>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-600">Free · dauerhaft kostenlos</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-700">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Bis {FREE_FIXED_PLAYER_LIMIT} feste Spieler</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Zu-/Absagen und faire Teams</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Bis {FREE_ACTIVE_CATEGORY_LIMIT} Kategorien</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> Spiele, Ergebnisse und Mannschaftskasse</li>
            </ul>
          </div>
          <div className="min-w-0 rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-violet-800"><Crown className="h-4 w-4" /> PRO · optional</p>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-700">
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /> Mehr Spieler, Gäste und Kategorien</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /> Flexible Zu-/Absagefristen</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /> Turniere, Saisonarchiv und Karriere-Stats</li>
              <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" /> {INTRO_PRICING.monthly.label}/Monat oder {INTRO_PRICING.yearly.label}/Jahr</li>
            </ul>
          </div>
        </div>
        {preview ? (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" /> Dies ist nur die Vorschau. Der echte Tarif eines neuen Vereins hängt von der zum Gründungszeitpunkt aktiven Testphase ab. Hier wird nichts gebucht.
          </p>
        ) : !isPaidOrFounderPro ? (
          <Link href="/pro" className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-800 hover:bg-violet-50">
            PRO-Details und Preise ansehen (optional)
          </Link>
        ) : (
          <Link href="/pro" className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">
            PRO-Status und Abo verwalten
          </Link>
        )}
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-xs leading-5 text-cyan-950">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <span><strong>Nächster Schritt:</strong> Einrichtung abschließen, Mitspieler einladen und das erste Training gemeinsam nutzen. Das geht auch ohne PRO-Kauf.</span>
      </div>
    </div>
  );
}
