// ═══ home.js — HomeView (tela inicial) ═══

function HomeView({user, members, isAdmin, setNav, showToast, eventos=[], oracoes=[]}) {
  const primeiroNome = (user?.nome||"").split(" ")[0];
  const hoje = new Date();

  // Próximos eventos — ordenar por data, só futuros (hoje incluso)
  const MESES = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  const DIAS_PT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const hojeStr = hoje.toISOString().slice(0,10);
  const proxEventos = [...eventos]
    .filter(e => e.data >= hojeStr)
    .sort((a,b) => a.data.localeCompare(b.data))
    .slice(0,3);

  function fmtEvento(ev) {
    const d = new Date(ev.data + "T12:00");
    return {
      dia: d.getDate(),
      mes: MESES[d.getMonth()],
      diaSem: DIAS_PT[d.getDay()],
    };
  }

  // Tempo relativo para orações
  function tempoRelativo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "agora mesmo";
    if (diff < 3600) return "há " + Math.floor(diff/60) + " min";
    if (diff < 86400) return "há cerca de " + Math.floor(diff/3600) + " hora" + (Math.floor(diff/3600)>1?"s":"");
    if (diff < 172800) return "ontem";
    return "há " + Math.floor(diff/86400) + " dias";
  }

  const ultimasOracoes = [...oracoes].sort((a,b)=>(b.ts||b.id||0)-(a.ts||a.id||0)).slice(0,2);
  const testemunhos = oracoes.filter(o=>o.tipo==="testemunho"||o.testemunho).length;

  // Cards do menu — 4 fixos conforme imagem
  const menuCards = [
    {key:"membros",  label:"Membros",  nav:"membros",  bg:"#EEF3FF", color:"#2563eb",
      icon: React.createElement("svg",{width:28,height:28,viewBox:"0 0 24 24",fill:"none",stroke:"#2563eb",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
        React.createElement("path",{d:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"}),
        React.createElement("circle",{cx:"9",cy:"7",r:"4"}),
        React.createElement("path",{d:"M23 21v-2a4 4 0 0 0-3-3.87"}),
        React.createElement("path",{d:"M16 3.13a4 4 0 0 1 0 7.75"}))},
    {key:"agenda",   label:"Agenda",   nav:"agenda",   bg:"#FFF3F3", color:"#dc2626",
      icon: React.createElement("svg",{width:28,height:28,viewBox:"0 0 24 24",fill:"none",stroke:"#dc2626",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
        React.createElement("rect",{x:"3",y:"4",width:"18",height:"18",rx:"2",ry:"2"}),
        React.createElement("line",{x1:"16",y1:"2",x2:"16",y2:"6"}),
        React.createElement("line",{x1:"8",y1:"2",x2:"8",y2:"6"}),
        React.createElement("line",{x1:"3",y1:"10",x2:"21",y2:"10"}))},
    {key:"oracao",   label:"Orações",  nav:"oracao",   bg:"#FFF0F0", color:"#e11d48",
      icon: React.createElement("svg",{width:28,height:28,viewBox:"0 0 24 24",fill:"none",stroke:"#e11d48",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
        React.createElement("path",{d:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"}))},
    {key:"infantil", label:"Infantil", nav:"infantil", bg:"#FFF5E6", color:"#ea580c",
      icon: React.createElement("svg",{width:28,height:28,viewBox:"0 0 24 24",fill:"none",stroke:"#ea580c",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"},
        React.createElement("circle",{cx:"12",cy:"8",r:"4"}),
        React.createElement("path",{d:"M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"}),
        React.createElement("circle",{cx:"5",cy:"15",r:"2"}),
        React.createElement("circle",{cx:"19",cy:"15",r:"2"}))},
  ];

  return (
    <div style={{background:"#f5f6fa", minHeight:"100%", paddingBottom:32}}>

      {/* ── TOPO ──────────────────────────────────────────────────────── */}
      <div style={{padding:"28px 20px 20px"}}>
        <h2 style={{margin:0,fontSize:24,fontWeight:800,color:"#1e293b",lineHeight:1.2}}>
          Bem-vindo, {primeiroNome}!
        </h2>
        <p style={{margin:"4px 0 0",fontSize:14,color:"#94a3b8"}}>
          Aqui você acompanha tudo que acontece.
        </p>
      </div>

      {/* ── GRID DE CARDS ─────────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,padding:"0 16px 8px"}}>
        {menuCards.map(c => (
          <button key={c.key} onClick={()=>setNav(c.nav)} style={{
            background:"#fff",border:"1.5px solid #f1f5f9",borderRadius:16,
            padding:"18px 12px",display:"flex",flexDirection:"column",
            alignItems:"flex-start",gap:10,cursor:"pointer",
            boxShadow:"0 1px 4px rgba(0,0,0,0.05)",textAlign:"left",
            transition:"all .15s",
          }}>
            <div style={{
              width:48,height:48,borderRadius:14,background:c.bg,
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              {c.icon}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#1e293b",marginBottom:2}}>{c.label}</div>
              <div style={{fontSize:12,color:"#94a3b8"}}>Acessar área</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── PRÓXIMOS EVENTOS ──────────────────────────────────────────── */}
      <div style={{margin:"16px 16px 0",background:"#fff",borderRadius:20,
        border:"1.5px solid #f1f5f9",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",overflow:"hidden"}}>

        {/* Cabeçalho */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 16px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>Próximos Eventos</span>
          </div>
          <button onClick={()=>setNav("agenda")} style={{
            background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",gap:4,
            fontSize:13,color:"#94a3b8",fontWeight:500,padding:0,
          }}>
            Ver todos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Lista de eventos */}
        {proxEventos.length === 0 ? (
          <div style={{padding:"12px 16px 16px",fontSize:13,color:"#94a3b8",textAlign:"center"}}>
            Nenhum evento próximo cadastrado
          </div>
        ) : (
          <div style={{borderTop:"1px solid #f8fafc"}}>
            {proxEventos.map((ev,i) => {
              const {dia,mes,diaSem} = fmtEvento(ev);
              return (
                <div key={ev.id||i} style={{
                  display:"flex",alignItems:"flex-start",gap:14,
                  padding:"12px 16px",
                  borderBottom: i < proxEventos.length-1 ? "1px solid #f8fafc" : "none",
                }}>
                  {/* Badge data */}
                  <div style={{
                    minWidth:44,textAlign:"center",background:"#FFF3F3",
                    borderRadius:10,padding:"6px 4px",
                  }}>
                    <div style={{fontSize:10,fontWeight:700,color:"#dc2626",letterSpacing:0.5,lineHeight:1}}>{mes}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#dc2626",lineHeight:1.1}}>{dia}</div>
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>{ev.titulo}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>
                      {diaSem}{ev.hora ? " às "+ev.hora : ""}
                    </div>
                    {ev.local && <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{ev.local}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé */}
        <div style={{borderTop:"1px solid #f1f5f9"}}>
          <button onClick={()=>setNav("agenda")} style={{
            width:"100%",padding:"13px",background:"none",border:"none",
            cursor:"pointer",fontSize:13,color:"#64748b",fontWeight:500,
          }}>
            Ver agenda completa
          </button>
        </div>
      </div>

      {/* ── MURAL DE ORAÇÕES ─────────────────────────────────────────── */}
      <div style={{margin:"16px 16px 0",background:"#fff",borderRadius:20,
        border:"1.5px solid #f1f5f9",boxShadow:"0 1px 4px rgba(0,0,0,0.04)",overflow:"hidden"}}>

        {/* Cabeçalho */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"16px 16px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap:"round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>Mural de Orações</span>
            {testemunhos > 0 && (
              <span style={{display:"flex",alignItems:"center",gap:4,
                fontSize:11,color:"#059669",background:"#f0fdf4",
                borderRadius:20,padding:"2px 8px",fontWeight:600}}>
                ✨ {testemunhos} testemunho{testemunhos>1?"s":""}
              </span>
            )}
          </div>
          <button onClick={()=>setNav("oracao")} style={{
            background:"none",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",gap:4,
            fontSize:13,color:"#94a3b8",fontWeight:500,padding:0,
          }}>
            Ver todos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Orações */}
        {ultimasOracoes.length === 0 ? (
          <div style={{padding:"12px 16px 16px",fontSize:13,color:"#94a3b8",textAlign:"center"}}>
            Nenhum pedido de oração ainda
          </div>
        ) : (
          <div style={{borderTop:"1px solid #f8fafc"}}>
            {ultimasOracoes.map((o,i) => (
              <div key={o.id||i} style={{
                padding:"12px 16px",
                borderBottom: i < ultimasOracoes.length-1 ? "1px solid #f8fafc" : "none",
              }}>
                <div style={{fontSize:14,color:"#1e293b",lineHeight:1.5}}>
                  {o.texto||o.pedido||o.content||""}
                </div>
                <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>
                  {tempoRelativo(o.ts||o.id||Date.now())}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

