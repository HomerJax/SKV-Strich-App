import Link from "next/link";

export default function PowerUserClubsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="bg-neutral-100 px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl justify-end">
          <Link
            href="/power-user/clubs/cleanup"
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm transition hover:bg-rose-50"
          >
            Club-Cleanup
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
