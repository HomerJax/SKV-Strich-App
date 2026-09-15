export default function SessionsLoading() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-sm">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-white/55">Sessions</div>
          <div className="mt-2 text-2xl font-black">Trainings & Termine</div>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/70">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Daten werden geladen…
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-[24px] border border-slate-200 bg-white" />
          ))}
        </div>
      </section>
    </main>
  );
}
