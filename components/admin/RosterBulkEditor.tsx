import { getServerI18n } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  balance_group: string | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest: boolean | null;
  roster_role: "player" | "staff" | null;
};

type ClubSettingsRow = {
  use_strength: boolean | null;
  strength_default: number | null;
  use_categories: boolean | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
};

type ClubCategoryRow = {
  key: string;
  label: string;
};

type Props = {
  players: PlayerRow[];
  settings: ClubSettingsRow | null;
  categories: ClubCategoryRow[];
};

const BALANCE_GROUP_OPTIONS: Array<{ value: string; labelKey: MessageKey }> = [
  { value: "Gehfußballer", labelKey: "roster.balanceWalking" },
  { value: "Defensivanker", labelKey: "roster.balanceDefense" },
  { value: "Offensivfokus", labelKey: "roster.balanceAttack" },
  { value: "Laufstark", labelKey: "roster.balanceRunner" },
  { value: "Techniker", labelKey: "roster.balanceTechnician" },
  { value: "Balance-Gruppe 1", labelKey: "roster.balance1" },
  { value: "Balance-Gruppe 2", labelKey: "roster.balance2" },
  { value: "Balance-Gruppe 3", labelKey: "roster.balance3" },
];

function boolToYesNo(value: boolean | null | undefined) {
  return value ? "1" : "0";
}

function playerHeadline(player: PlayerRow, fallback: string) {
  const fullName = [player.first_name, player.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || player.name?.trim() || player.nickname?.trim() || fallback;
}

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-900";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-900";

export default async function RosterBulkEditor({
  players,
  settings,
  categories,
}: Props) {
  const { t } = await getServerI18n();

  function positionLabel(player: PlayerRow) {
    if (player.preferred_position === "attack") {
      return settings?.attack_label || t("roster.positionAttack");
    }
    if (player.preferred_position === "defense") {
      return settings?.defense_label || t("roster.positionDefense");
    }
    if (player.preferred_position === "goalkeeper") {
      return settings?.goalkeeper_label || t("roster.positionGoalkeeper");
    }
    return t("roster.positionOpen");
  }

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500 shadow-sm">
        {t("roster.empty")}
      </div>
    );
  }

  return (
    <form method="post" action="/admin/players/update-all" className="space-y-3">
      <div className="sticky top-2 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
        <div>
          <div className="text-sm font-semibold text-slate-950">
            {t("roster.edit")}
          </div>
          <div className="text-[11px] text-slate-500">
            {t("roster.editHint")}
          </div>
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("roster.saveAll")}
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {players.map((player) => {
            const categoryLabel =
              categories.find((category) => category.key === player.category_key)?.label ??
              null;

            return (
              <details key={player.id} className="group px-5 py-2">
                <input type="hidden" name="player_id" value={String(player.id)} />
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3 transition hover:bg-slate-50 marker:hidden [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {playerHeadline(
                        player,
                        t("roster.playerFallback", { id: player.id }),
                      )}
                    </div>
                    {categoryLabel ? (
                      <span className="inline-flex shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        {categoryLabel}
                      </span>
                    ) : null}
                    <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {positionLabel(player)}
                    </span>
                    {settings?.use_strength ? (
                      <span className="inline-flex shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {t("roster.strengthBadge", {
                          value: player.strength ?? settings.strength_default ?? 3,
                        })}
                      </span>
                    ) : null}
                    {player.balance_group ? (
                      <span className="inline-flex shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        {player.balance_group}
                      </span>
                    ) : null}
                    {player.roster_role === "staff" ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                        {t("roster.staff")}
                      </span>
                    ) : null}
                    {!player.is_active ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        {t("roster.inactive")}
                      </span>
                    ) : null}
                    {player.is_guest ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
                        {t("roster.guest")}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-open:rotate-180">
                    ▼
                  </span>
                </summary>

                <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                  <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {t("roster.pendingChanges")}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label htmlFor={`first_name_${player.id}`} className={labelClass}>
                        {t("roster.firstName")}
                      </label>
                      <input
                        id={`first_name_${player.id}`}
                        name={`first_name_${player.id}`}
                        defaultValue={player.first_name ?? ""}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`last_name_${player.id}`} className={labelClass}>
                        {t("roster.lastName")}
                      </label>
                      <input
                        id={`last_name_${player.id}`}
                        name={`last_name_${player.id}`}
                        defaultValue={player.last_name ?? ""}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`nickname_${player.id}`} className={labelClass}>
                        {t("roster.nickname")}
                      </label>
                      <input
                        id={`nickname_${player.id}`}
                        name={`nickname_${player.id}`}
                        defaultValue={player.nickname ?? ""}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`email_${player.id}`} className={labelClass}>
                        {t("roster.email")}
                      </label>
                      <input
                        id={`email_${player.id}`}
                        name={`email_${player.id}`}
                        type="email"
                        defaultValue={player.email ?? ""}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label htmlFor={`roster_role_${player.id}`} className={labelClass}>
                        {t("roster.role")}
                      </label>
                      <select
                        id={`roster_role_${player.id}`}
                        name={`roster_role_${player.id}`}
                        defaultValue={player.roster_role ?? "player"}
                        className={fieldClass}
                      >
                        <option value="player">{t("roster.rolePlayer")}</option>
                        <option value="staff">{t("roster.roleStaff")}</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`preferred_position_${player.id}`}
                        className={labelClass}
                      >
                        {settings?.position_label || t("roster.position")}
                      </label>
                      <select
                        id={`preferred_position_${player.id}`}
                        name={`preferred_position_${player.id}`}
                        defaultValue={player.preferred_position ?? ""}
                        className={fieldClass}
                      >
                        <option value="">{t("roster.positionOpen")}</option>
                        <option value="attack">
                          {settings?.attack_label || t("roster.positionAttack")}
                        </option>
                        <option value="defense">
                          {settings?.defense_label || t("roster.positionDefense")}
                        </option>
                        <option value="goalkeeper">
                          {settings?.goalkeeper_label || t("roster.positionGoalkeeper")}
                        </option>
                      </select>
                    </div>

                    {settings?.use_categories ? (
                      <div>
                        <label htmlFor={`category_key_${player.id}`} className={labelClass}>
                          {t("roster.category")}
                        </label>
                        <select
                          id={`category_key_${player.id}`}
                          name={`category_key_${player.id}`}
                          defaultValue={player.category_key ?? ""}
                          className={fieldClass}
                        >
                          <option value="">{t("roster.noCategory")}</option>
                          {categories.map((category) => (
                            <option key={category.key} value={category.key}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {settings?.use_strength ? (
                      <div>
                        <label htmlFor={`strength_${player.id}`} className={labelClass}>
                          {t("roster.strength")}
                        </label>
                        <select
                          id={`strength_${player.id}`}
                          name={`strength_${player.id}`}
                          defaultValue={String(
                            player.strength ?? settings.strength_default ?? 3,
                          )}
                          className={fieldClass}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                          <option value="4">4</option>
                          <option value="5">5</option>
                        </select>
                      </div>
                    ) : null}

                    <div>
                      <label htmlFor={`balance_group_${player.id}`} className={labelClass}>
                        {t("roster.balanceGroup")}
                      </label>
                      <select
                        id={`balance_group_${player.id}`}
                        name={`balance_group_${player.id}`}
                        defaultValue={player.balance_group ?? ""}
                        className={fieldClass}
                      >
                        <option value="">{t("roster.noBalanceGroup")}</option>
                        {BALANCE_GROUP_OPTIONS.map((group) => (
                          <option key={group.value} value={group.value}>
                            {t(group.labelKey)}
                          </option>
                        ))}
                        {player.balance_group &&
                        !BALANCE_GROUP_OPTIONS.some(
                          (group) => group.value === player.balance_group,
                        ) ? (
                          <option value={player.balance_group}>
                            {t("roster.currentBalanceGroup", {
                              group: player.balance_group,
                            })}
                          </option>
                        ) : null}
                      </select>
                    </div>

                    <div>
                      <label htmlFor={`is_active_${player.id}`} className={labelClass}>
                        {t("roster.activeForTraining")}
                      </label>
                      <select
                        id={`is_active_${player.id}`}
                        name={`is_active_${player.id}`}
                        defaultValue={boolToYesNo(player.is_active)}
                        className={fieldClass}
                      >
                        <option value="1">{t("roster.yes")}</option>
                        <option value="0">{t("roster.no")}</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`is_guest_${player.id}`} className={labelClass}>
                        {t("roster.guestPlayer")}
                      </label>
                      <select
                        id={`is_guest_${player.id}`}
                        name={`is_guest_${player.id}`}
                        defaultValue={boolToYesNo(player.is_guest)}
                        className={fieldClass}
                      >
                        <option value="0">{t("roster.no")}</option>
                        <option value="1">{t("roster.yes")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t("roster.saveAll")}
        </button>
      </div>
    </form>
  );
}
