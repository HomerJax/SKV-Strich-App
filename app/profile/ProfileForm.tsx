"use client";

import { useActionState, useMemo, useState } from "react";
import type { AuthPlayer } from "@/lib/auth/context";
import { updateProfileAction, type ProfileState } from "./actions";
import { useI18n } from "@/components/i18n/I18nProvider";

type ProfileFormProps={player:AuthPlayer|null;email:string;activeClubName:string|null;activeClubId:string|null};
const INITIAL_STATE:ProfileState={error:"",success:""};
export default function ProfileForm({player,email,activeClubName,activeClubId}:ProfileFormProps){
 const {t}=useI18n();
 const [firstName,setFirstName]=useState(player?.first_name??""); const [lastName,setLastName]=useState(player?.last_name??""); const [nickname,setNickname]=useState(player?.nickname??""); const [userEmail,setUserEmail]=useState(email); const [edited,setEdited]=useState(false); const [state,formAction,isPending]=useActionState(updateProfileAction,INITIAL_STATE); const activeError=edited?"":state.error; const activeSuccess=edited?"":state.success; const clubLabel=useMemo(()=>activeClubName||activeClubId||t("profile.noActiveClub"),[activeClubName,activeClubId,t]);
 const edit=()=>setEdited(true);
 return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="text-[11px] font-black uppercase tracking-[.18em] text-slate-400">{t("profile.accountData")}</div><h2 className="mt-1 text-xl font-black text-slate-950">{t("profile.personalData")}</h2><p className="mt-1 text-sm text-slate-600">{t("profile.personalDataHint")}</p><div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{t("profile.activeClub",{club:clubLabel})}</div>
 {activeError?<div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{activeError}</div>:null}{activeSuccess?<div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{activeSuccess}</div>:null}
 <form action={formAction} onSubmit={()=>setEdited(false)} className="mt-4 grid gap-4"><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-slate-800">{t("profile.firstName")}<input name="first_name" value={firstName} onChange={e=>{setFirstName(e.target.value);edit();}} required disabled={isPending} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="text-sm font-medium text-slate-800">{t("profile.lastName")}<input name="last_name" value={lastName} onChange={e=>{setLastName(e.target.value);edit();}} required disabled={isPending} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label></div><label className="text-sm font-medium text-slate-800">{t("profile.nickname")}<input name="nickname" value={nickname} onChange={e=>{setNickname(e.target.value);edit();}} disabled={isPending} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><label className="text-sm font-medium text-slate-800">{t("profile.email")}<input name="email" type="email" value={userEmail} onChange={e=>{setUserEmail(e.target.value);edit();}} required disabled={isPending} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"/></label><button disabled={isPending} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">{isPending?t("profile.saving"):t("profile.saveData")}</button></form></section>;
}
