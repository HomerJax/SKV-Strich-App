import Link from "next/link";

export default function LogoutButton() {
  return (
    <Link
      href="/logout"
      className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
    >
      Logout
    </Link>
  );
}