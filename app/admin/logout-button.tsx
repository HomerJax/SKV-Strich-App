export default function LogoutButton() {
  return (
    <form method="post" action="/api/logout">
      <button
        type="submit"
        className="rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
      >
        Logout
      </button>
    </form>
  );
}