// ═══ app.js — Componente raiz App() + ReactDOM.render ═══

function App() {
  const [user, setUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [congregacoes, setCongregacoes] = useState(() => {
    try {
      const r = localStorage.getItem("sec_congregacoes");
      return r ? JSON.parse(r) : [{id:1,nome:"ASSEMBLEIA DE DEUS DE DIADEMA - SEDE"}];
    } catch(e) { return [{id:1,nome:"ASSEMBLEIA DE DEUS DE DIADEMA - SEDE"}]; }
  });
  const [criancasApp, setCriancasApp] = useState(() => {
    try { const r = localStorage.getItem("church_criancas"); return r ? JSON.parse(r) : []; }
    catch(e) { return []; }
  });
  const [eventosApp, setEventosApp] = useState(() => {
    try {
      // Agenda usa window.storage (Artifact Storage), fallback localStorage
      const r = localStorage.getItem("church_eventos");
      return r ? JSON.parse(r) : [];
    } catch(e) { return []; }
  });
  const [oracoesApp, setOracoesApp] = useState(() => {
    try { const r = localStorage.getItem("church_oracoes"); return r ? JSON.parse(r) : []; }
    catch(e) { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [nav, setNav] = useState("home");
  const [secExp, setSecExp] = useState({sec:false, membros:false, grupos:false, escalas:false, histPastoral:false, configSec:false});
  const [secPage, setSecPage] = useState("ficha"); // ficha|cargos|situacoes|congregacoes|tiposadm|histtipos|grupos_cad|grupos_cat|escalas_ev|escalas_gest|escalas_mensal|escalas_minhas|cartas|certs|config
  const [timeoutWarn, setTimeoutWarn] = useState(false);
  const timerRef = useRef(null);
  const warnRef = useRef(null);
  const sidebarScrollRef = useRef(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3200); };

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    setTimeoutWarn(false);
    warnRef.current = setTimeout(() => setTimeoutWarn(true), WARN_MS);
    timerRef.current = setTimeout(() => { setUser(null); setTimeoutWarn(false); }, SESSION_MS);
  }, []);

  useEffect(() => {
    if (!user) return;
    const evs = ["mousemove","keydown","touchstart","click"];
    evs.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => { evs.forEach(e => window.removeEventListener(e, resetTimer)); if(timerRef.current) clearTimeout(timerRef.current); if(warnRef.current) clearTimeout(warnRef.current); };
  }, [user, resetTimer]);

  // ── Sync criancas, eventos e orações em tempo real ─────────────────────
  React.useEffect(() => {
    if (!user) return;
    fbListen("church/criancas", (data) => {
      if (data && Array.isArray(data)) {
        setCriancasApp(data);
        try { localStorage.setItem("church_criancas", JSON.stringify(data)); } catch(e) {}
      }
    });
    // Orações via Firebase
    fbListen("church/oracoes", (data) => {
      if (data && Array.isArray(data)) {
        setOracoesApp(data);
        try { localStorage.setItem("church_oracoes", JSON.stringify(data)); } catch(e) {}
      }
    });
    // Eventos da Agenda (Artifact Storage fallback)
    const loadEventos = async () => {
      try {
        const r = await window.storage.get("church_eventos");
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          setEventosApp(parsed);
          try { localStorage.setItem("church_eventos", JSON.stringify(parsed)); } catch(e) {}
        }
      } catch(e) {}
    };
    loadEventos();
    const ivEv = setInterval(loadEventos, 30000); // atualiza a cada 30s
    return () => clearInterval(ivEv);
  }, [user]);

  // ── Heartbeat de presença online ────────────────────────────────────────
  React.useEffect(() => {
    if (!user) return;
    const tick = async () => {
      try {
        const device = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "📱 Mobile" : "💻 Desktop";
        await fbSet("church/presence/" + user.id, {
          id:user.id, nome:user.nome, nivel:user.nivel||"user",
          loginAt:user.loginAt||Date.now(), lastSeen:Date.now(), device
        });
      } catch(e) {}
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => { clearInterval(interval); try{fbSet("church/presence/"+user.id, null);}catch(e){} };
  }, [user]);

  // Inicializar Firebase uma vez
  useEffect(() => { initFirebase(); }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        // Tentar Firebase primeiro
        const fbData = await fbGet("church/members");
        if (fbData && Array.isArray(fbData)) {
          setMembers(fbData);
          await saveEncrypted("church_members", fbData); // sync local
        } else {
          // Fallback: storage local
          const data = await loadEncrypted("church_members");
          if (data) setMembers(data);
        }
      } catch(e) {
        try { const data = await loadEncrypted("church_members"); if(data) setMembers(data); } catch(e2) {}
      }
      setLoading(false);
    })();
  }, [user]);

  const save = useCallback(async list => {
    setSaving(true);
    try {
      // Salvar no Firebase E no storage local (fallback)
      const saved = await fbSet("church/members", list);
      if (!saved) await saveEncrypted("church_members", list);
      else await saveEncrypted("church_members", list); // sempre salva local também
    } catch(e) {}
    setSaving(false);
  }, []);

  if (!user) return <PinLogin onLogin={async u => {
    // Super admin e admins aprovados têm acesso direto
    const cadastroCompleto = u.nivel === "super" || u.cadastroCompleto === true;
    setUser({...u, cadastroCompleto}); setLoading(true);
    // Registrar presença online no Firebase
    try {
      const presKey = "church/presence/" + u.id;
      const device = /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "📱 Mobile" : "💻 Desktop";
      await fbSet(presKey, {id:u.id, nome:u.nome, nivel:u.nivel||"user", loginAt:Date.now(), lastSeen:Date.now(), device});
    } catch(e) {}
    // Registrar log de acesso
    try {
      const existing = await loadEncrypted("church_access_log") || [];
      const entry = {id:Date.now(), admin:u.nome, nivel:u.nivel, em:new Date().toLocaleString("pt-BR"), tipo:"login"};
      const updated = [entry, ...existing].slice(0, 500);
      await saveEncrypted("church_access_log", updated);
    } catch(e) {}
  }} />;

  // ── PRIMEIRO ACESSO: formulário de cadastro obrigatório ─────────────────────
  if (user && !user.cadastroCompleto) {
    return (
      <PrimeiroCadastro
        user={user}
        onComplete={updatedUser => { setUser(updatedUser); setLoading(false); }}
        onLogout={async () => {
          try {
            const existing = await loadEncrypted("church_access_log") || [];
            const entry = {id:Date.now(), admin:user.nome, nivel:user.nivel, em:new Date().toLocaleString("pt-BR"), tipo:"logout"};
            await saveEncrypted("church_access_log", [entry,...existing].slice(0,500));
          } catch(e) {}
          setUser(null);
        }}
        members={members}
        setMembers={setMembers}
        save={save}
      />
    );
  }

  const isAdmin = user?.nivel === "super" || user?.nivel === "admin";
  const anivHoje = members.filter(m => isAniv(m.nascimento) && m.ativo).length;
  const NAVS_ALL = [
    {id:"home",       l:"Início",     icon:"🏠"},
    {id:"membros",    l:"Membros",    icon:"👥"},
    {id:"infantil",   l:"Infantil",   icon:"👶"},
    {id:"relatorio",  l:"Aniversariantes", icon:"🎂"},
    {id:"agenda",     l:"Agenda",     icon:"📅"},
    {id:"oracao",     l:"Oração",     icon:"🙏"},
    {id:"escalas",    l:"Escalas",    icon:"📋"},
    ...(isAdmin ? [{id:"whatsapp", l:"WhatsApp", icon:"💬"}] : []),
    ...(isAdmin ? [{id:"secretaria", l:"Secretaria", icon:"📁"}] : []),
    ...(isAdmin ? [{id:"admin", l:"Admin", icon:"⚙️"}] : []),
  ];
  const NAVS = NAVS_ALL;
  const navLabel = NAVS.find(n=>n.id===nav)?.l || "";
  const isMobile = window.innerWidth < 768;

  async function handleLogout() {
    // Remover presença online
    try { await fbSet("church/presence/" + user.id, null); } catch(e) {}
    try {
      const existing = await loadEncrypted("church_access_log") || [];
      const entry = {id:Date.now(), admin:user.nome, nivel:user.nivel, em:new Date().toLocaleString("pt-BR"), tipo:"logout"};
      await saveEncrypted("church_access_log", [entry,...existing].slice(0,500));
    } catch(e) {}
    setUser(null);
  }

  const SIDEBAR_W = 230;

  // ── SIDEBAR (PC/tablet) ──────────────────────────────────────────────────
  const SidebarNav = () => (
    <div style={{
      width:SIDEBAR_W, flexShrink:0,
      background:"#ffffff",
      display:"flex", flexDirection:"column",
      position:"fixed", top:0, left:0, bottom:0,
      boxShadow:"2px 0 12px rgba(0,0,0,0.08)",
      borderRight:"1px solid #e8e8e8",
      zIndex:50, overflowY:"auto"
    }}>
      {/* Logo — cabeçalho cinza claro */}
      <div style={{padding:"20px 16px 16px",background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:44,height:44,borderRadius:10,background:"#fff",boxShadow:"0 2px 8px rgba(139,50,48,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <img src={LOGO_B64} style={{width:36,height:36,objectFit:"contain"}} alt="Logo"/>
          </div>
          <div>
            <div style={{color:"#1e293b",fontWeight:800,fontSize:13,lineHeight:1.3}}>Assembleia de Deus</div>
            <div style={{color:"#8b3230",fontSize:10,fontWeight:700,letterSpacing:2,marginTop:2}}>DIADEMA</div>
          </div>
        </div>
        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"8px 11px",display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#8b3230,#c9a84c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0}}>
            {user.nome[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:"#1e293b",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nome}</div>
            <div style={{color:"#64748b",fontSize:10}}>{user.nivel==="super"?"Super Admin":user.nivel==="admin"?"Admin":user.cargo||"Membro"}</div>
          </div>
          {user.nivel==="super" && <span style={{background:"#7c3aed",color:"#fff",borderRadius:5,padding:"1px 6px",fontSize:9,fontWeight:700}}>Super</span>}
        </div>
      </div>
      {/* Itens */}
      <div
        ref={el=>{
          if(el && sidebarScrollRef.current!==el){
            sidebarScrollRef.current=el;
            // Restaurar scroll salvo ao recriar o componente
            if(sidebarScrollRef._savedScroll) el.scrollTop=sidebarScrollRef._savedScroll;
          }
        }}
        onScroll={e=>{ sidebarScrollRef._savedScroll=e.target.scrollTop; }}
        style={{flex:1,padding:"10px 8px",overflowY:"auto",background:"#fff"}}>
        {(()=>{
          const SideIcos = {
            home:      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
            membros:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            infantil:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="6" r="4"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/></svg>,
            relatorio: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7z"/><path d="M4 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2"/><path d="M2 21h20"/></svg>,
            agenda:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            oracao:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>,
            whatsapp:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
            admin:     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>,
          };
          return NAVS.filter(t=>t.id!=="secretaria").map(t=>(
            <button key={t.id} className="nav-btn" onClick={()=>{
              setNav(t.id);
              setSecExp(s=>({...s,sec:false,membros:false,grupos:false,escalas:false,histPastoral:false,configSec:false}));
            }} style={{
              width:"100%",display:"flex",alignItems:"center",gap:10,
              padding:"10px 14px",border:"none",cursor:"pointer",
              borderRadius:10,marginBottom:2,textAlign:"left",
              background:nav===t.id?"#fef2f2":"transparent",
              transition:"all 0.15s"
            }}>
              <div style={{
                width:32,height:32,borderRadius:9,flexShrink:0,
                background:nav===t.id?"#ffeaea":"#f8fafc",
                display:"flex",alignItems:"center",justifyContent:"center",
                color:nav===t.id?"#8b3230":"#64748b",
                transition:"all 0.15s"
              }}>
                {SideIcos[t.id]||<span style={{fontSize:14}}>{t.icon}</span>}
              </div>
              <span style={{color:nav===t.id?"#8b3230":"#4b5563",fontWeight:nav===t.id?700:500,fontSize:13,flex:1}}>{t.l}</span>
              {t.id==="membros" && anivHoje>0 && <span style={{background:"#fbbf24",color:"#000",borderRadius:20,padding:"1px 7px",fontSize:10,fontWeight:700}}>🎂{anivHoje}</span>}
            </button>
          ));
        })()}
        {/* ── SECRETARIA expansível ── */}
        {(()=>{
          const isSecNav = nav==="secretaria";
          const SItem = ({page,label,indent=1})=>(
            <button onClick={()=>{setNav("secretaria");setSecPage(page);}} style={{
              width:"100%",display:"flex",alignItems:"center",gap:8,
              padding:`7px 12px 7px ${12+indent*14}px`,border:"none",cursor:"pointer",
              borderRadius:8,marginBottom:1,textAlign:"left",
              background:(isSecNav&&secPage===page)?"#fef2f2":"transparent",
              borderLeft:(isSecNav&&secPage===page)?"3px solid #8b3230":"3px solid transparent",
            }}>
              <span style={{color:(isSecNav&&secPage===page)?"#8b3230":"#64748b",fontSize:12,fontWeight:(isSecNav&&secPage===page)?700:400}}>{label}</span>
            </button>
          );
          return (
            <div
              onMouseLeave={()=>{ if(!isSecNav) setSecExp(s=>({...s,sec:false,membros:false,grupos:false,escalas:false,histPastoral:false,configSec:false})); }}
            >
              {/* Secretaria header */}
              <button
                onClick={()=>{setSecExp(s=>({...s,sec:!s.sec}));setNav("secretaria");setSecPage("ficha");}}
                onMouseEnter={()=>setSecExp(s=>({...s,sec:true}))}
                style={{
                  width:"100%",display:"flex",alignItems:"center",gap:11,
                  padding:"11px 12px",border:"none",cursor:"pointer",
                  borderRadius:10,marginBottom:3,textAlign:"left",
                  background:isSecNav?"#fef2f2":"transparent",
                  borderLeft:isSecNav?"3px solid #8b3230":"3px solid transparent",
                }}>
                <span style={{fontSize:18,width:26,textAlign:"center",flexShrink:0}}>📁</span>
                <span style={{color:isSecNav?"#8b3230":"#4b5563",fontWeight:isSecNav?700:400,fontSize:13,flex:1}}>Secretaria</span>
                <span style={{color:"#94a3b8",fontSize:11}}>{secExp.sec?"▾":"▸"}</span>
              </button>
              {secExp.sec && (
                <div style={{borderLeft:"2px solid #fca5a5",marginLeft:18,paddingLeft:4}}>
                  {/* MEMBROS */}
                  <button onClick={()=>setSecExp(s=>({...s,membros:!s.membros,grupos:false,escalas:false,configSec:false}))} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"8px 12px 8px 26px",border:"none",cursor:"pointer",
                    borderRadius:8,marginBottom:1,textAlign:"left",background:"transparent"
                  }}>
                    <span style={{fontSize:13,color:"#374151",fontWeight:600,flex:1}}>≡ Membros</span>
                    <span style={{color:"#94a3b8",fontSize:10}}>{secExp.membros?"▾":"▸"}</span>
                  </button>
                  {secExp.membros && (
                    <div>
                      <SItem page="ficha" label="📋 Ficha Cadastral"/>
                      <SItem page="cargos" label="💼 Cargos"/>
                      <SItem page="situacoes" label="🔖 Situações"/>
                      <SItem page="congregacoes" label="🏠 Congregações"/>
                      <SItem page="tiposadm" label="🔑 Tipos de Admissão"/>
                      {/* Histórico Pastoral */}
                      <button onClick={()=>setSecExp(s=>({...s,histPastoral:!s.histPastoral}))} style={{
                        width:"100%",display:"flex",alignItems:"center",gap:8,
                        padding:"7px 12px 7px 26px",border:"none",cursor:"pointer",
                        borderRadius:8,marginBottom:1,textAlign:"left",background:"transparent"
                      }}>
                        <span style={{color:"#64748b",fontSize:12,flex:1}}>≡ Histórico Pastoral</span>
                        <span style={{color:"#94a3b8",fontSize:10}}>{secExp.histPastoral?"▾":"▸"}</span>
                      </button>
                      {secExp.histPastoral && (
                        <SItem page="histtipos" label="🏷 Tipos de Histórico" indent={2}/>
                      )}
                    </div>
                  )}
                  {/* GRUPOS */}
                  <button onClick={()=>setSecExp(s=>({...s,grupos:!s.grupos,membros:false,histPastoral:false,escalas:false,configSec:false}))} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"8px 12px 8px 26px",border:"none",cursor:"pointer",
                    borderRadius:8,marginBottom:1,textAlign:"left",background:"transparent"
                  }}>
                    <span style={{fontSize:13,color:"#374151",fontWeight:600,flex:1}}>🏘 Grupos</span>
                    <span style={{color:"#94a3b8",fontSize:10}}>{secExp.grupos?"▾":"▸"}</span>
                  </button>
                  {secExp.grupos && (
                    <div>
                      <SItem page="grupos_cad" label="👥 Cadastro"/>
                      <SItem page="grupos_cat" label="🏷 Categorias de Grupos"/>
                    </div>
                  )}
                  {/* ESCALAS */}
                  <button onClick={()=>setSecExp(s=>({...s,escalas:!s.escalas,membros:false,histPastoral:false,grupos:false,configSec:false}))} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"8px 12px 8px 26px",border:"none",cursor:"pointer",
                    borderRadius:8,marginBottom:1,textAlign:"left",background:"transparent"
                  }}>
                    <span style={{fontSize:13,color:"#374151",fontWeight:600,flex:1}}>📅 Escalas</span>
                    <span style={{color:"#94a3b8",fontSize:10}}>{secExp.escalas?"▾":"▸"}</span>
                  </button>
                  {secExp.escalas && (
                    <div>
                      <SItem page="escalas_ev" label="📅 Eventos"/>
                      <SItem page="escalas_gest" label="⚙️ Gestão de Escalas"/>
                      <SItem page="escalas_mensal" label="📆 Escala Mensal"/>
                      <SItem page="escalas_minhas" label="👤 Minhas Escalas"/>
                    </div>
                  )}
                  {/* CARTAS / CERTS / CONFIG */}
                  <button onClick={()=>setSecExp(s=>({...s,configSec:!s.configSec,membros:false,histPastoral:false,grupos:false,escalas:false}))} style={{
                    width:"100%",display:"flex",alignItems:"center",gap:8,
                    padding:"8px 12px 8px 26px",border:"none",cursor:"pointer",
                    borderRadius:8,marginBottom:1,textAlign:"left",background:"transparent"
                  }}>
                    <span style={{fontSize:13,color:"#374151",fontWeight:600,flex:1}}>⚙️ Configurações</span>
                    <span style={{color:"#94a3b8",fontSize:10}}>{secExp.configSec?"▾":"▸"}</span>
                  </button>
                  {secExp.configSec && (
                    <div>
                      <SItem page="cartas" label="✉️ Cartas"/>
                      <SItem page="certs" label="📜 Certificados"/>
                      <SItem page="config" label="⚙️ Dados da Igreja"/>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
      {/* Rodapé */}
      <div style={{padding:"12px 8px",borderTop:"1px solid #f1f5f9",background:"#fff"}}>
        {saving && <div style={{color:"#94a3b8",fontSize:10,textAlign:"center",marginBottom:6}}>salvando...</div>}
        {timeoutWarn && <div style={{background:"#fef9c3",border:"1px solid #fde047",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#854d0e",fontWeight:600,textAlign:"center",marginBottom:6}}>⚠️ Sessão expira em 1 min</div>}
        <button onClick={handleLogout} style={{width:"100%",padding:"10px",border:"1px solid #e2e8f0",borderRadius:9,background:"#f8fafc",color:"#64748b",cursor:"pointer",fontWeight:600,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
          🚪 Sair
        </button>
      </div>
    </div>
  );


  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif",color:"#1e293b",display:"flex"}}>
      <style>{`
        .mrow:hover{background:#f8fafc!important}
        .nav-btn:hover{background:rgba(255,255,255,0.07)!important}
        * { box-sizing:border-box; }
        @media(max-width:767px){ body { font-size:14px; } }
      `}</style>

      {/* Sidebar visível apenas em telas >= 768px */}
      {!isMobile && <SidebarNav/>}

      {/* Bottom nav visível apenas em celular */}
      {isMobile && <BottomNav nav={nav} setNav={setNav} isAdmin={isAdmin} anivHoje={anivHoje} saving={saving} handleLogout={handleLogout} navLabel={navLabel} setSecPage={setSecPage}/>}
      {user?.nivel==="super" && <OnlineUsersPanel currentUser={user}/>}

      {/* Conteúdo principal */}
      <div style={{
        flex:1,
        marginLeft: isMobile ? 0 : SIDEBAR_W,
        marginTop: isMobile ? 52 : 0,
        marginBottom: isMobile ? 66 : 0,
        padding:"18px 14px",
        maxWidth: isMobile ? "100%" : `calc(100% - ${SIDEBAR_W}px)`
      }}>
        {loading && nav!=="admin"
          ? <div style={{textAlign:"center",padding:60,color:"#94a3b8"}}><div style={{fontSize:32,marginBottom:8}}>✝</div>Carregando...</div>
          : <>
              {nav==="home"      && <HomeView user={user} members={members} isAdmin={isAdmin} setNav={setNav} showToast={showToast} eventos={eventosApp} oracoes={oracoesApp}/>}
              {nav==="oracao"    && <OracaoView user={user} showToast={showToast}/>}
              {nav==="membros"   && <MembrosView members={members} setMembers={setMembers} save={save} showToast={showToast} currentUser={user} isAdmin={isAdmin} congregacoes={congregacoes} criancas={criancasApp} setNav={setNav}/>}
              {nav==="relatorio" && <RelatorioView members={members} congregacoes={congregacoes}/>}
              {nav==="conserva"  && <ConservaView members={members} showToast={showToast}/>}
              {nav==="agenda"    && <AgendaView members={members} showToast={showToast} isAdmin={isAdmin}/>}
              {nav==="infantil"  && <InfantilView members={members} showToast={showToast} congregacoes={congregacoes}/>}
              {nav==="whatsapp"  && <WhatsAppView members={members}/>}
              {nav==="escalas"   && <EscalasView members={members} currentUser={user} showToast={showToast} isAdmin={isAdmin} congregacoes={congregacoes}/>}
              {nav==="secretaria" && <SecretariaView members={members} setMembers={setMembers} save={save} showToast={showToast} secPage={secPage} setSecPage={setSecPage} congregacoesApp={congregacoes} setCongregacoesApp={setCongregacoes}/>}
              {nav==="admin"     && <AdminView currentUser={user} showToast={showToast} members={members} setMembers={setMembers} save={save}/>}
            </>
        }
      </div>
      <Toast msg={toast?.msg} type={toast?.type}/>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
