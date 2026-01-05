import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-slate-900">Admin</h1>

      <div className="space-y-2">
        <Link
          href="/admin/seasons"
          className="block rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
        >
          Saisons verwalten
        </Link>

        <Link
          href="/players"
          className="block rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
        >
          Spieler verwalten
        </Link>
      </div>
    </div>
  );
}
