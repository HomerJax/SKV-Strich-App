"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
export default function WizardReturn(){
 const [active,setActive]=useState(false);
 useEffect(()=>{setActive(new URLSearchParams(window.location.search).get("from")==="setup")},[]);
 if(!active)return null;
 return <Link href="/admin/setup" className="fixed bottom-20 right-4 z-[90] rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-2xl ring-2 ring-cyan-400">← Zurück zum Einrichtungs-Wizard</Link>;
}
