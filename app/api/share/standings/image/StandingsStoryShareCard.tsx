import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";
import { StoryShareFrame } from "@/components/share/result-share/StoryShareCard";

type RankRow = {
  player_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  rank: number;
  wins: number;
  sessions: number;
  deltaRank?: number | null;
};

function playerName(row: RankRow, locale: AppLocale) {
  const proper = [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ");
  return proper || row.name?.trim() || row.nickname?.trim() || translate(locale, "standings.unknownPlayer");
}

export default function StandingsStoryShareCard({
  rows, label, date, isPro, locale,
}: {
  rows: RankRow[];
  label: string;
  date: string;
  isPro: boolean;
  locale: AppLocale;
}) {
  return <StoryShareFrame eyebrow="Tabelle · Top 10" title="DIE BESTEN." subtitle={label + " · Stand " + date}>
    <div style={{display:"flex",flexDirection:"column",width:"100%",height:"100%",padding:"35px 31px 26px",
      background:"linear-gradient(155deg,#12294b 0%,#071c31 54%,#070f29 100%)",color:"#fff"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"2px 14px 25px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",fontWeight:900,fontSize:17,letterSpacing:3,color:"#5eead4"}}>STRIKR RANKING</div>
          <div style={{display:"flex",fontWeight:950,fontSize:75,letterSpacing:-3,lineHeight:.98}}>TOP 10<span style={{color:"#5eead4"}}>.</span></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:9}}>
          <div style={{display:"flex",fontSize:19,fontWeight:800,color:"#8fe9e1"}}>{label}</div>
          <div style={{display:"flex",fontSize:17,fontWeight:700,color:"rgba(255,255,255,.67)"}}>{date}</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9,flex:1}}>
        {rows.slice(0,10).map((row,i)=>{
          const podium=i<3;
          const accent=i===0?"#5eead4":i===1?"#93c5fd":i===2?"#c4b5fd":"#cbd5e1";
          return <div key={row.player_id} style={{display:"flex",height:podium?109:91,alignItems:"center",
            padding:"0 17px 0 15px",borderRadius:21,border:podium?"1px solid rgba(94,234,212,.36)":"1px solid rgba(255,255,255,.10)",
            background:i===0?"linear-gradient(100deg,rgba(13,148,136,.60),rgba(16,66,84,.60))":podium?"rgba(74,102,152,.25)":"rgba(255,255,255,.055)"}}>
            <div style={{display:"flex",width:63,height:63,alignItems:"center",justifyContent:"center",borderRadius:16,
              color:accent,background:"rgba(3,16,30,.52)",fontWeight:950,fontSize:podium?36:30}}>{row.rank}</div>
            <div style={{display:"flex",flexDirection:"column",flex:1,minWidth:0,marginLeft:18,gap:7}}>
              <div style={{display:"flex",fontSize:podium?28:25,fontWeight:900,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {playerName(row,locale).slice(0,27)}
              </div>
              <div style={{display:"flex",gap:12,fontSize:16,fontWeight:700,color:"rgba(225,246,247,.72)"}}>
                <span>{row.sessions} {translate(locale,"standings.shareAppearances")}</span>
                <span>·</span>
                <span>{isPro && row.sessions>0?Math.round(row.wins/row.sessions*100)+"%":"—"} Quote</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:94,gap:4}}>
              <span style={{fontSize:podium?48:39,fontWeight:950,lineHeight:1,color:accent}}>{row.wins}</span>
              <span style={{fontSize:14,fontWeight:800,letterSpacing:1.2,color:"rgba(255,255,255,.72)"}}>SIEGE</span>
            </div>
          </div>;
        })}
      </div>
      <div style={{display:"flex",height:57,marginTop:17,alignItems:"center",justifyContent:"space-between",
        borderTop:"1px solid rgba(94,234,212,.23)",fontSize:18,fontWeight:850,color:"#a5dcd8"}}>
        <span>JEDES TRAINING ZÄHLT.</span>
        <span>strikr.team</span>
      </div>
    </div>
  </StoryShareFrame>;
}
