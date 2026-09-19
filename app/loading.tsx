function SkeletonLine({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`animate-pulse rounded-full bg-slate-200 ${className}`} />;
}

function SkeletonCard({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm ${
        tall ? "min-h-[220px]" : "min-h-[132px]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-2.5 w-24" />
          <SkeletonLine className="mt-4 h-5 w-2/3" />
          <SkeletonLine className="mt-3 h-3 w-full" />
          <SkeletonLine className="mt-2 h-3 w-4/5" />
        </div>
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100" />
      </div>
      {tall ? (
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-12 rounded-2xl bg-slate-100" />
          <div className="h-12 rounded-2xl bg-slate-100" />
        </div>
      ) : null}
    </div>
  );
}

export default function AppLoading() {
  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[30px] bg-slate-950 px-5 py-6 text-white shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative animate-pulse">
            <div className="h-2.5 w-24 rounded-full bg-white/20" />
            <div className="mt-4 h-7 w-1/2 rounded-full bg-white/15" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>

        <SkeletonCard tall />
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </section>
    </main>
  );
}
