import Link from "next/link";
import { requireCashboxAccess } from "@/lib/cashbox/access";

export default async function MannschaftskassePage() {
  const { canManageCashbox, canManageBeer, isClubAdmin } = await requireCashboxAccess();
  const sections = [
    { title: "Alle offenen Posten", description: "Offene Strafen und Bestätigungen", href: canManageCashbox ? "/admin/penalties?tab=penalties" : "/mannschaftskasse/strafen" },
    { title: "Kabinenregeln", description: "Strafen und Glücksrad", href: canManageCashbox || isClubAdmin ? "/mannschaftskasse/kabinenregeln" : "/mannschaftskasse/strafen" },
    { title: "Bierkasse", description: "Bier-Rangliste und Gönner", href: "/mannschaftskasse/bier-rangliste" },
    ...(canManageBeer ? [{ title: "Bierzahlungen prüfen", description: "Buchungen und Zahlungseingänge", href: "/mannschaftskasse/bier" }] : []),
    ...(canManageCashbox ? [
      { title: "Beiträge & Kassenbuch", description: "Beiträge, Einnahmen und Ausgaben", href: "/admin/penalties?tab=contributions" },
      { title: "Zahlungen & Konten", description: "Zahlungsübersicht und Konten", href: "/mannschaftskasse/zahlungen" },
    ] : []),
  ];
  return <main className="min-h-screen bg-[#f6f7f9] px-4 py-5 pb-28">
    <div className="mx-auto max-w-2xl">
      <Link href="/home" className="text-sm font-medium text-slate-500">← Home</Link>
      <h1 className="mt-5 mb-5 text-2xl font-black tracking-tight text-slate-950">Mannschaftskasse</h1>
      <nav aria-label="Mannschaftskasse" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {sections.map((section,index)=><Link key={section.title} href={section.href}
          className={`flex min-h-[76px] items-center gap-3 px-4 py-3 transition hover:bg-slate-50 ${index?"border-t border-slate-100":""}`}>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold text-slate-950">{section.title}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{section.description}</span></span>
          <span aria-hidden="true" className="text-xl font-light text-slate-400">›</span>
        </Link>)}
      </nav>
    </div>
  </main>;
}
