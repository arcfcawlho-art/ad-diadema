// ═══ components.js — Componentes base: Avatar, Badge, Btn, Card, Modal, Field, Toast, useClock, BottomNav ═══

function Avatar({nome, foto, size=44}) {
  const letters = nome ? nome.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase() : "?";
  const palette = ["#7C3AED","#DC2626","#059669","#D97706","#2563EB","#DB2777","#0891B2"];
  const color = palette[(nome?.charCodeAt(0)||0) % palette.length];
  if (foto) return <img src={foto} alt={nome} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"2px solid #fff",flexShrink:0}} />;
  return <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color}cc,${color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:size*0.35,flexShrink:0,border:"2px solid #fff"}}>{letters}</div>;
}

function Badge({label}) {
  const map = {Membro:"#6366f1",Pastor:"#dc2626",Diacono:"#0891b2",Presbitero:"#059669",Evangelista:"#d97706",Missionario:"#7c3aed"};
  const c = map[label] || "#64748b";
  return <span style={{background:c+"22",color:c,border:`1px solid ${c}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{label}</span>;
}

function Btn({children, onClick, color="gray", size="md", disabled=false, full=false}) {
  const colors = {
    blue: {background:"linear-gradient(135deg,#742a28,#5c1a18)",color:"#fff"},
    green: {background:"linear-gradient(135deg,#25d366,#128c7e)",color:"#fff"},
    red: {background:"#fef2f2",color:"#dc2626"},
    purple: {background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff"},
    gray: {background:"#f1f5f9",color:"#475569"},
    ghost: {background:"transparent",color:"#64748b"},
    yellow: {background:"#fef9c3",color:"#92400e"},
  };
  const sizes = {sm:{padding:"5px 11px",fontSize:12}, md:{padding:"8px 16px",fontSize:13}, lg:{padding:"10px 22px",fontSize:15}};
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...colors[color],...sizes[size],border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:5,opacity:disabled?0.5:1,width:full?"100%":undefined,justifyContent:full?"center":undefined}}>
      {children}
    </button>
  );
}

function Card({children, pad=18, gap=0, border=""}) {
  return <div style={{background:"#fff",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",padding:pad,marginBottom:gap,border:border||"none"}}>{children}</div>;
}

function Modal({children, onClose, width=460}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:width,boxShadow:"0 20px 60px rgba(0,0,0,0.2)",maxHeight:"90vh",overflowY:"auto"}}>
        {children}
      </div>
    </div>
  );
}

function Field({label, children}) {
  return (
    <div>
      <label style={{display:"block",fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>{label}</label>
      {children}
    </div>
  );
}

const INP = {width:"100%",padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:14,boxSizing:"border-box",background:"#f8fafc",outline:"none"};
const SEL = {...INP, cursor:"pointer"};

function Toast({msg, type}) {
  if (!msg) return null;
  const bg = type==="error" ? "#fee2e2" : type==="warn" ? "#fef9c3" : "#dcfce7";
  const clr = type==="error" ? "#dc2626" : type==="warn" ? "#92400e" : "#16a34a";
  return <div style={{position:"fixed",bottom:24,right:24,padding:"12px 20px",borderRadius:12,fontWeight:600,fontSize:14,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:9999,background:bg,color:clr}}>{msg}</div>;
}

// ── LOGIN ──────────────────────────────────────────────────────────────────────
// ── LOGIN ──────────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(()=>setNow(new Date()),1000); return ()=>clearInterval(t); },[]);
  return now;
}

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  @keyframes starTwinkle { 0%,100%{opacity:var(--op,0.5)} 50%{opacity:0.05} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp { from{opacity:0;transform:translateY(50px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-12px)} 40%,80%{transform:translateX(12px)} }
  @keyframes dotPop { 0%{transform:scale(0.3)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
  @keyframes rippleOut { 0%{transform:scale(0.2);opacity:0.5} 100%{transform:scale(4);opacity:0} }
  @keyframes successPop { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(139,50,48,0.1)} 50%{box-shadow:0 0 40px rgba(139,50,48,0.2)} }
  @keyframes arrowDrift { 0%,100%{transform:translateX(0);opacity:0.25} 50%{transform:translateX(10px);opacity:0.7} }
  @keyframes spinLoader { to{transform:rotate(360deg)} }
  @keyframes coloPulse { 0%,100%{opacity:0.7} 50%{opacity:0.2} }
  .lk-key { transition:transform 0.08s, background 0.12s; -webkit-tap-highlight-color:transparent; user-select:none; cursor:pointer; }
  .lk-key:hover { background:rgba(255,255,255,0.18) !important; }
  .lk-key:active { transform:scale(0.87) !important; }
  .lk-del:active { transform:scale(0.87) !important; opacity:0.6; }
  .lk-enter:not([disabled]):hover { filter:brightness(1.12); }
  .lk-enter:not([disabled]):active { transform:scale(0.96) !important; }
  .unlock-pill:hover { background:rgba(255,255,255,0.14) !important; }
  .unlock-pill:active { transform:scale(0.97); }
`;

const STARS = Array.from({length:55},(_,i)=>({
  id:i,
  x: (Math.sin(i*7.3)*50+50),
  y: (Math.cos(i*4.1)*50+50),
  s: i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1,
  op: 0.15 + (i%4)*0.15,
  dur: 2 + (i%4),
  delay: (i%6)*0.7,
}));

// ── SUPER ADMIN PRÉ-CONFIGURADO ──────────────────────────────────────────────
const SUPER_ADMIN = {
  id: 1,
  nome: "Fabricio de Carvalho",
  pin: hashPin("5779"),
  nivel: "super",
  cadastroCompleto: true
};

const BottomNav = ({isAdmin, nav, setNav, anivHoje, saving, handleLogout, navLabel, setSecPage}) => {

  const SVG = {
    home:    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>),
    membros: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
    agenda:  (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>),
    oracao:  (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>),
    escalas: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="13" y2="18"/></svg>),
    aniv:    (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 5-5 9-5 9s-5-4-5-9a5 5 0 0 1 5-5z"/><circle cx="12" cy="7" r="2"/></svg>),
  };

  const TABS = [
    {id:"home",    l:"Início",  k:"home",    nav:"home"},
    {id:"membros", l:"Membros", k:"membros", nav:"membros"},
    {id:"agenda",  l:"Agenda",  k:"agenda",  nav:"agenda"},
    {id:"oracao",  l:"Oração",  k:"oracao",  nav:"oracao"},
    ...(isAdmin
      ? [{id:"escalas", l:"Escalas", k:"escalas", nav:"escalas"}]
      : [{id:"aniv",    l:"Aniversários", k:"aniv", nav:"relatorio"}]
    ),
  ];

  const ACTIVE_COLORS = {
    home:"#dc2626", membros:"#2563eb", agenda:"#dc2626",
    oracao:"#e11d48", escalas:"#059669", aniv:"#d97706",
  };

  return (
    <>
      {/* TopBar */}
      <div style={{
        position:"fixed",top:0,left:0,right:0,height:56,zIndex:50,
        background:"#ffffff",
        borderBottom:"1px solid #f1f5f9",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 16px",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <img src={LOGO_B64} style={{width:34,height:34,objectFit:"contain",borderRadius:8}} alt="Logo"/>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#1e293b",lineHeight:1}}>{navLabel||"AD Diadema"}</div>
            <div style={{fontSize:11,color:"#94a3b8",lineHeight:1,marginTop:2}}>Assembleia de Deus</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {saving && <div style={{fontSize:11,color:"#94a3b8"}}>salvando…</div>}
          <button onClick={handleLogout} style={{
            background:"#f8fafc",border:"1px solid #f1f5f9",
            borderRadius:10,padding:"7px 14px",
            fontSize:13,fontWeight:600,color:"#64748b",cursor:"pointer",
          }}>Sair</button>
        </div>
      </div>

      {/* BottomNav */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        height:64,zIndex:50,
        background:"#ffffff",
        borderTop:"1px solid #f1f5f9",
        display:"flex",alignItems:"stretch",
      }}>
        {TABS.map(t => {
          const active = nav===t.nav || (t.nav==="relatorio" && nav==="relatorio");
          const color  = ACTIVE_COLORS[t.k] || "#dc2626";
          return (
            <button key={t.id} onClick={()=>{
              if(t.nav==="escalas") { setNav("escalas"); }
              else setNav(t.nav);
            }} style={{
              flex:1,display:"flex",flexDirection:"column",
              alignItems:"center",justifyContent:"center",gap:3,
              background:"none",border:"none",cursor:"pointer",
              color: active ? color : "#94a3b8",
              borderTop: active ? "2px solid "+color : "2px solid transparent",
              transition:"all .15s",
            }}>
              <div style={{color: active ? color : "#94a3b8"}}>
                {SVG[t.k]}
              </div>
              <span style={{fontSize:10,fontWeight: active ? 700 : 500}}>
                {t.l}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};

