import Image from "next/image";

type Props = {
  club?: {
    name?: string;
    logo_url?: string | null;
  };
  user?: {
    nickname?: string | null;
  };
};

export function HeaderClub({ club, user }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Logo */}
      {club?.logo_url ? (
        <img
          src={club.logo_url}
          alt="Club Logo"
          className="h-9 w-9 rounded-md object-cover"
        />
      ) : (
        <Image
          src="/icon.png" // dein strikr logo
          alt="Strikr"
          width={36}
          height={36}
          className="rounded-md"
        />
      )}

      {/* Text */}
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-slate-900">
          {club?.name ?? "Strikr"}
        </span>

        {user?.nickname && (
          <span className="text-xs text-slate-500">
            {user.nickname}
          </span>
        )}
      </div>
    </div>
  );
}