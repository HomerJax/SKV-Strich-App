export default function AppLoading() {
  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="h-28 animate-pulse rounded-[28px] bg-slate-200/80" />

        <div className="h-36 animate-pulse rounded-[28px] border border-slate-200 bg-white" />

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 grid grid-cols-4 gap-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-[22px] bg-slate-100"
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="h-14 animate-pulse rounded-[24px] bg-slate-100" />
            <div className="h-14 animate-pulse rounded-[24px] bg-slate-100" />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
        </div>
      </section>
    </main>
  );
}
