"use client";

import Link from "next/link";

type HeaderAuthActionsProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
};

export default function HeaderAuthActions({
  isLoggedIn,
  isAdmin,
}: HeaderAuthActionsProps) {
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

      <Link
        href="/logout"
prefetch={false}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
      >
        Logout
      </Link>
    </div>
  );
}