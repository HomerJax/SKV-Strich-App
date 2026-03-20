"use client";

export default function LogoutButton() {
  return (
    <form method="post" action="/api/logout">
      <button
        type="submit"
        className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm transition hover:bg-neutral-100"
      >
        Logout
      </button>
    </form>
  );
}