"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SKIP_PREFIXES = ["/login","/signup","/join","/onboarding","/datenschutz","/impressum","/power-user","/api"];
const DEVICE_KEY = "strikr:analytics-visit";
function deviceInfo() {
  if (typeof navigator === "undefined") return {};
  const agent=navigator.userAgent;
  const platform=/iPad|iPhone|iPod/.test(agent)?"ios":/Android/.test(agent)?"android":/Windows/.test(agent)?"windows":/Macintosh|Mac OS X/.test(agent)?"macos":"other";
  const standalone=typeof window!=="undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as Navigator & {standalone?:boolean}).standalone)));
  return {platform,standalone,app_mode:standalone?"standalone":"browser",user_agent:agent.slice(0,350)};
}
function send(event:string,path:string,metadata:Record<string,unknown>={}) {
 void fetch("/api/analytics/track",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify({event,path,metadata:{...metadata,...deviceInfo()}}),keepalive:true,
 }).catch(()=>undefined);
}
export function trackProductEvent(event:string,metadata?:Record<string,unknown>) {
 if(typeof window==="undefined")return;
 send(event,window.location.pathname,metadata);
}
export default function ProductAnalyticsTracker(){
 const pathname=usePathname();
 const lastPath=useRef<string|null>(null);
 useEffect(()=>{
  if(!pathname||lastPath.current===pathname)return;
  lastPath.current=pathname;
  if(SKIP_PREFIXES.some(prefix=>pathname===prefix||pathname.startsWith(prefix+"/")))return;
  // First authenticated page view of each browser tab is a visit, not a verified login.
  try {if(!sessionStorage.getItem(DEVICE_KEY)){sessionStorage.setItem(DEVICE_KEY,"1");send("visit_started",pathname);}}catch{}
  send("page_open",pathname);
 },[pathname]);
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   const target=event.target;
   if(!(target instanceof Element))return;
   const tracked=target.closest<HTMLElement>("[data-track-event]");
   if(!tracked)return;
   const action=tracked.dataset.trackEvent;
   if(!action||!/^[a-z0-9_]{2,60}$/.test(action))return;
   send("ui_action",window.location.pathname,{action});
  };
  document.addEventListener("click",onClick);
  return ()=>document.removeEventListener("click",onClick);
 },[]);
 return null;
}
