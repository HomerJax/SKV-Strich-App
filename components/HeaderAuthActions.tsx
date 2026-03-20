"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type HeaderAuthActionsProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export default function HeaderAuthActions({
  isLoggedIn,
  isAdmin,
}: HeaderAuthActionsProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
        >
          Admin
        </Link>
      )}

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
      >
        Logout
      </button>
    </div>
  );
}