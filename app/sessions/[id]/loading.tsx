export default function SessionDetailLoading() {
  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="mt-2 h-6 w-52 max-w-full animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="mt-4 text-sm font-semibold text-slate-600">
            Session wird geladen …
          </div>
        </div>

        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-20 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ))}
      </section>
    </main>
  );
}
