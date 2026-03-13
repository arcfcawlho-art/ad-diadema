// ═══ secretaria.js — SecretariaView, AdminView, ModalNovoAdmin, OnlineUsersPanel, AccessLogView ═══

function AccessLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await loadEncrypted("church_access_log");
        setLogs(data || []);
      } catch(e) {}
      setLoading(false);
    })();
  }, []);

  if (loading) return <Card><div style={{textAlign:"center",padding:20,color:"#94a3b8"}}>Carregando...</div></Card>;
  if (logs.length === 0) return <Card><div style={{textAlign:"center",padding:28,color:"#94a3b8"}}>Nenhum acesso registrado ainda.</div></Card>;

  return (
    <div>
      {logs.map(l => (
        <div key={l.id} style={{display:"flex",gap:10,padding:"9px 14px",background:"#fff",borderRadius:8,marginBottom:4,boxShadow:"0 1px 3px rgba(0,0,0,0.04)",alignItems:"center"}}>
          <div style={{fontSize:20}}>{l.tipo==="login" ? "🔓" : "🔒"}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontWeight:700,fontSize:13}}>{l.admin}</span>
              <span style={{background:l.nivel==="super"?"#f3e8ff":"#eff6ff",color:l.nivel==="super"?"#7c3aed":"#2563eb",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:600}}>{l.nivel==="super"?"Super Admin":"Admin"}</span>
              <span style={{background:l.tipo==="login"?"#dcfce7":"#fee2e2",color:l.tipo==="login"?"#16a34a":"#dc2626",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:600}}>{l.tipo==="login"?"Entrou":"Saiu"}</span>
            </div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{l.em}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PAINEL DE USUÁRIOS ONLINE (só super admin) ─────────────────────────────
function OnlineUsersPanel({currentUser}) {
  const [onlineUsers, setOnlineUsers] = React.useState([]);
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (currentUser?.nivel !== "super") return;
    // Escutar presença em tempo real
    fbListen("church/presence", (data) => {
      if (!data) { setOnlineUsers([]); return; }
      const now = Date.now();
      const users = Object.values(data)
        .filter(u => u && u.nome && (now - (u.lastSeen||0)) < 90000) // 90s tolerância
        .sort((a,b) => (b.lastSeen||0) - (a.lastSeen||0));
      setOnlineUsers(users);
    });
  }, [currentUser]);

  if (currentUser?.nivel !== "super") return null;

  const count = onlineUsers.length;
  const nivelLabel = {super:"Super", admin:"Admin", user:"Membro"};
  const nivelColor = {super:"#7c3aed", admin:"#2563eb", user:"#059669"};

  return (
    <div style={{position:"fixed",bottom:80,right:16,zIndex:900}}>
      {/* Botão flutuante */}
      <button onClick={()=>setExpanded(e=>!e)} style={{
        background:"linear-gradient(135deg,#742a28,#5c1a18)",
        border:"none",borderRadius:50,padding:"10px 16px",
        boxShadow:"0 4px 20px rgba(116,42,40,0.45)",
        cursor:"pointer",display:"flex",alignItems:"center",gap:8,
        color:"#fff",fontWeight:700,fontSize:13,
        transition:"transform .2s",transform:expanded?"scale(0.95)":"scale(1)"
      }}>
        <span style={{position:"relative",display:"inline-flex"}}>
          {/* Indicador pulsante */}
          <span style={{
            display:"inline-block",width:10,height:10,borderRadius:"50%",
            background: count>0 ? "#22c55e" : "#94a3b8",
            boxShadow: count>0 ? "0 0 0 0 rgba(34,197,94,0.4)":"none",
            animation: count>0 ? "presencePulse 2s ease-in-out infinite" : "none"
          }}/>
        </span>
        <span>{count} online</span>
        <span style={{fontSize:10,opacity:.8}}>{expanded?"▼":"▲"}</span>
      </button>

      {/* Painel expandido */}
      {expanded && (
        <div style={{
          position:"absolute",bottom:"calc(100% + 10px)",right:0,
          background:"#fff",borderRadius:16,
          boxShadow:"0 8px 40px rgba(0,0,0,0.18)",
          border:"1px solid rgba(139,50,48,0.1)",
          width:280,maxHeight:360,overflow:"hidden",
          display:"flex",flexDirection:"column"
        }}>
          {/* Header */}
          <div style={{
            padding:"12px 16px",
            background:"linear-gradient(135deg,#742a28,#5c1a18)",
            display:"flex",alignItems:"center",justifyContent:"space-between"
          }}>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:"#fff"}}>Usuários Online</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:1}}>
                Atualiza a cada 30s
              </div>
            </div>
            <div style={{
              background:"rgba(255,255,255,0.2)",borderRadius:20,
              padding:"3px 10px",fontSize:13,fontWeight:800,color:"#fff"
            }}>{count}</div>
          </div>

          {/* Lista */}
          <div style={{overflowY:"auto",flex:1}}>
            {count === 0 ? (
              <div style={{textAlign:"center",padding:"28px 16px",color:"#94a3b8"}}>
                <div style={{fontSize:32,marginBottom:8}}>😴</div>
                <div style={{fontSize:13,fontWeight:600}}>Nenhum usuário online</div>
              </div>
            ) : onlineUsers.map((u,i) => {
              const secsAgo = Math.floor((Date.now() - (u.lastSeen||0)) / 1000);
              const tempoStr = secsAgo < 10 ? "agora mesmo" : secsAgo < 60 ? secsAgo+"s atrás" : Math.floor(secsAgo/60)+"min atrás";
              const isMe = u.id === currentUser.id;
              return (
                <div key={u.id||i} style={{
                  display:"flex",alignItems:"center",gap:10,
                  padding:"10px 16px",
                  borderBottom:"1px solid #f8fafc",
                  background:isMe?"#f5f3ff":"#fff"
                }}>
                  {/* Avatar + indicador verde */}
                  <div style={{position:"relative",flexShrink:0}}>
                    <div style={{
                      width:36,height:36,borderRadius:"50%",
                      background:`linear-gradient(135deg,${nivelColor[u.nivel]||"#64748b"},${nivelColor[u.nivel]||"#94a3b8"}99)`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      color:"#fff",fontWeight:700,fontSize:14
                    }}>{u.nome[0].toUpperCase()}</div>
                    <div style={{
                      position:"absolute",bottom:-1,right:-1,
                      width:11,height:11,borderRadius:"50%",
                      background:"#22c55e",border:"2px solid #fff"
                    }}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                      <span style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.nome}</span>
                      {isMe && <span style={{fontSize:9,background:"#ede9fe",color:"#7c3aed",borderRadius:10,padding:"1px 5px",fontWeight:700}}>Você</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:10,background:`${nivelColor[u.nivel]||"#64748b"}22`,color:nivelColor[u.nivel]||"#64748b",borderRadius:10,padding:"1px 6px",fontWeight:600}}>
                        {nivelLabel[u.nivel]||"Membro"}
                      </span>
                      <span style={{fontSize:10,color:"#94a3b8"}}>{u.device||""}</span>
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>🕐 {tempoStr}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{padding:"8px 14px",background:"#f8fafc",borderTop:"1px solid #f1f5f9",fontSize:11,color:"#94a3b8",textAlign:"center"}}>
            Online = ativo nos últimos 90s
          </div>
        </div>
      )}

      <style>{`
        @keyframes presencePulse {
          0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)}
          50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}
        }
      `}</style>
    </div>
  );
}


// ── ADMIN ──────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// ESCALAS VIEW — independente, acessível por admins e membros
// Sub-páginas: "eventos" | "escalar" | "minhas"
// ════════════════════════════════════════════════════════════════════════════
function SecretariaView({members, setMembers, save, showToast, secPage, setSecPage}) {
  // ── Estado principal: seção ──
  const [secao, setSecao]   = useState("membros"); // membros | grupos | escalas
  // ── Sub-tabs por seção ──
  const [subMembro, setSubMembro] = useState("lista");
  const [subGrupo,  setSubGrupo]  = useState("cadastro");
  const [subEscala, setSubEscala] = useState("eventos");

  // ── Dados persistidos ──
  const [config, setConfig] = useState(() => {
    try { const r = localStorage.getItem("church_config"); return r ? JSON.parse(r) : {}; } catch(e) { return {}; }
  });
  const [cargos, setCargos] = useState(() => {
    try { const r = localStorage.getItem("sec_cargos"); return r ? JSON.parse(r) : [
      "Membro","Pastor","Presbitero","Diacono","Cooperador","Evangelista","Bispo",
      "Pastor Presidente","Missionaria","Diaconisa"
    ]; } catch(e) { return []; }
  });
  const [situacoes, setSituacoes] = useState(() => {
    try { const r = localStorage.getItem("sec_situacoes"); return r ? JSON.parse(r) : [
      {id:1,nome:"Ativo",aniversario:true,saida:false},
      {id:2,nome:"Inativo",aniversario:false,saida:false},
      {id:3,nome:"Falecido",aniversario:true,saida:true},
      {id:4,nome:"Disciplinado",aniversario:true,saida:false},
      {id:5,nome:"Desviado",aniversario:true,saida:false},
    ]; } catch(e) { return []; }
  });
  const [congregacoes, setCongregacoes] = useState(() => {
    try { const r = localStorage.getItem("sec_congregacoes"); return r ? JSON.parse(r) : [
      {id:1,nome:"ASSEMBLEIA DE DEUS DE DIADEMA - SEDE"},
    ]; } catch(e) { return []; }
  });
  const [tiposAdmissao, setTiposAdmissao] = useState(() => {
    try { const r = localStorage.getItem("sec_tiposadm"); return r ? JSON.parse(r) : [
      "Batismo","Carta","Reconciliacao","Outros"
    ]; } catch(e) { return []; }
  });
  const [grupos, setGrupos] = useState(() => {
    try { const r = localStorage.getItem("sec_grupos"); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  });
  const [catGrupos, setCatGrupos] = useState(() => {
    try { const r = localStorage.getItem("sec_catgrupos"); return r ? JSON.parse(r) : [
      "Celulas","Pequenos Grupos","Grupos de Estudos Biblicos","Grupos de Comunhao"
    ]; } catch(e) { return []; }
  });
  const [eventos, setEventos] = useState(() => {
    try { const r = localStorage.getItem("sec_eventos"); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  });
  // Sync eventos do Firebase ao montar
  React.useEffect(() => {
    (async () => {
      try {
        const fb = await fbGet("church_secretaria/sec_eventos");
        if (fb && Array.isArray(fb) && fb.length > 0) {
          setEventos(fb);
          try { localStorage.setItem("sec_eventos", JSON.stringify(fb)); } catch(e) {}
        }
      } catch(e) {}
    })();
  }, []);

  // ── Modais / form states ──
  const [search,      setSearch]      = useState("");
  const [novoItem,    setNovoItem]    = useState("");
  const [editItem,    setEditItem]    = useState(null);
  const [novoGrupo,   setNovoGrupo]   = useState({nome:"",categoria:"",lider:""});
  const [novoEvento,  setNovoEvento]  = useState({nome:"",data:"",hora:""});
  const [certMembro,  setCertMembro]  = useState("");
  const [certData,    setCertData]    = useState("");
  const [certPastor,  setCertPastor]  = useState("");
  const [certTipo,    setCertTipo]    = useState("batismo");
  const [docTipo,     setDocTipo]     = useState("batismo");

  async function saveLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
    try { await fbSet("church_secretaria/" + key, val); } catch(e) {}
  }

  function showMsg(m) { showToast(m); }

  // ── Lista alfabética membros ──
  const sorted = [...members]
    .filter(m => m.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  // ── Helpers CRUD genérico (array de strings) ──
  function addStr(arr, setArr, key) {
    if (!novoItem.trim()) return;
    const novo = [...arr, novoItem.trim()];
    setArr(novo); saveLS(key, novo); setNovoItem(""); showMsg("Adicionado!");
  }
  function delStr(arr, setArr, key, idx) {
    const novo = arr.filter((_,i)=>i!==idx);
    setArr(novo); saveLS(key, novo); showMsg("Removido!");
  }

  // ── Gerar documento de impressão ──
  function gerarDocumento(tipo) {
    const m = members.find(mb => mb.id === Number(certMembro));
    if (!m) { showToast("Selecione um membro","error"); return; }
    const igreja = config.nomeIgreja || "Assembleia de Deus - Diadema";
    const pastor = certPastor || config.pastor || "Pastor Responsavel";
    const dataDoc = certData ? new Date(certData).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR");
    const hoje = new Date().toLocaleDateString("pt-BR");
    let titulo="", corpo="";
    if(tipo==="batismo"){
      titulo="CERTIFICADO DE BATISMO";
      corpo=`<p style="text-align:center;font-size:18px;margin:20px 0">Certificamos que</p>
        <p style="text-align:center;font-size:26px;font-weight:bold">${m.nome}</p>
        <p style="text-align:center;font-size:16px;margin:16px 0">foi batizado(a) nas aguas em nome do Pai, do Filho e do Espirito Santo,<br/>conforme Mateus 28:19.</p>
        <p style="text-align:center">Data: <strong>${dataDoc}</strong></p>`;
    } else if(tipo==="membresia"){
      titulo="CARTA DE MEMBRESIA";
      corpo=`<p>Certificamos que o(a) irmao(a) <strong>${m.nome}</strong> e membro fiel desta igreja desde <strong>${dataDoc}</strong>, participando regularmente das atividades e cultos.</p>`;
    } else if(tipo==="recomendacao"){
      titulo="CARTA DE RECOMENDACAO";
      corpo=`<p>Recomendamos o(a) irmao(a) <strong>${m.nome}</strong> a todas as igrejas evangelicas. E nosso membro fiel, de boa conduta e carater cristao comprovado.</p>`;
    } else if(tipo==="nascimento"){
      titulo="CARTA DE NASCIMENTO ESPIRITUAL";
      corpo=`<p>Certificamos que o(a) irmao(a) <strong>${m.nome}</strong> aceitou a Jesus Cristo como seu Senhor e Salvador em <strong>${dataDoc}</strong>, nascendo de novo pelo Espirito Santo (Jo 3:3).</p>`;
    } else if(tipo==="mudanca"){
      titulo="CARTA DE MUDANCA";
      corpo=`<p>Comunicamos a transferencia do(a) membro <strong>${m.nome}</strong> desta congregacao, recomendando-o(a) a outra igreja de fe.</p>`;
    } else if(tipo==="convertido"){
      titulo="CARTA DE NOVO CONVERTIDO";
      corpo=`<p>Apresentamos o(a) novo(a) convertido(a) <strong>${m.nome}</strong>, que recentemente aceitou a Jesus Cristo e necessita de acolhimento e discipulado.</p>`;
    }
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>body{font-family:Georgia,serif;padding:60px;max-width:700px;margin:0 auto;color:#1a1a1a}
    .hdr{text-align:center;border-bottom:3px solid #8b3230;padding-bottom:20px;margin-bottom:30px}
    h1{text-align:center;font-size:22px;color:#3d0c0a;margin:30px 0;letter-spacing:2px}
    p{font-size:15px;line-height:1.8;margin:12px 0}
    .sig{margin-top:60px;text-align:center;border-top:1px solid #999;padding-top:16px}
    @media print{button{display:none}}</style></head><body>
    <div class="hdr"><div style="font-size:22px;font-weight:bold;color:#8b3230">${igreja}</div>
    <div style="font-size:12px;color:#666;letter-spacing:2px">CGADB</div></div>
    <h1>${titulo}</h1><div>${corpo}</div>
    <div style="text-align:right;margin-top:30px;font-size:13px;color:#666">Diadema, ${hoje}</div>
    <div class="sig"><p>______________________________</p><p style="font-weight:bold">${pastor}</p>
    <p style="font-size:12px;color:#666">Pastor Presidente</p></div>
    <br/><button onclick="window.print()" style="background:#8b3230;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:15px;cursor:pointer;display:block;margin:0 auto">Imprimir</button>
    </body></html>`;
    const w=window.open("","_blank","width=800,height=700");
    w.document.write(html); w.document.close();
  }

  // ── Estilos ──
  const ST = {
    sBtn: (on) => ({
      padding:"9px 18px",border:"none",cursor:"pointer",borderRadius:8,fontWeight:700,fontSize:13,
      background:on?"#8b3230":"#f1f5f9",color:on?"#fff":"#64748b",transition:"all .15s"
    }),
    subBtn: (on) => ({
      padding:"7px 14px",border:"none",cursor:"pointer",borderRadius:7,fontWeight:600,fontSize:12,
      background:on?"#fff":"transparent",color:on?"#8b3230":"#64748b",
      boxShadow:on?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s"
    }),
    inp: {width:"100%",padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none"},
    btn: (c="#8b3230") => ({background:c,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontWeight:700,fontSize:13,cursor:"pointer"}),
    row: (i) => ({display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",
      background:i%2===0?"#fff":"#fafafa",borderBottom:"1px solid #f1f5f9"}),
    del: {background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 10px",fontSize:12,cursor:"pointer",fontWeight:700},
  };

  // Seção selector
  const SECOES = [
    {id:"membros",  l:"Membros",  icon:"👥"},
    {id:"grupos",   l:"Grupos",   icon:"🏘️"},
    {id:"escalas",  l:"Escalas",  icon:"📅"},
    {id:"cartas",   l:"Cartas",   icon:"✉️"},
    {id:"certs",    l:"Certificados", icon:"📜"},
    {id:"config",   l:"Config.",  icon:"⚙️"},
  ];

  // ── Menu mobile da Secretaria ──────────────────────────────────────────────
  const SEC_MENU = [
    {label:"📋 Fichas",        page:"ficha"},
    {label:"🏷️ Cargos",        page:"cargos"},
    {label:"📊 Situações",     page:"situacoes"},
    {label:"🏛️ Congregações",  page:"congregacoes"},
    {label:"📥 Admissão",      page:"tiposadm"},
    {label:"📖 Hist. Pastoral",page:"histtipos"},
    {label:"🏘️ Grupos",        page:"grupos_cad"},
    {label:"✉️ Cartas",         page:"cartas"},
    {label:"📜 Certificados",  page:"certs"},
    {label:"⚙️ Config.",        page:"config"},
  ];

  return (
    <div>
      {/* Menu mobile de navegação da Secretaria */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:14,
        scrollbarWidth:"none",WebkitOverflowScrolling:"touch"}}>
        {SEC_MENU.map(item=>(
          <button key={item.page} onClick={()=>setSecPage(item.page)} style={{
            flexShrink:0,padding:"7px 12px",borderRadius:20,border:"none",cursor:"pointer",
            fontSize:12,fontWeight:secPage===item.page?700:500,
            background:secPage===item.page?"#8b3230":"#f1f5f9",
            color:secPage===item.page?"#fff":"#475569",
            boxShadow:secPage===item.page?"0 2px 8px rgba(139,50,48,0.3)":"none",
            transition:"all .15s",whiteSpace:"nowrap"
          }}>{item.label}</button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div style={{marginBottom:16,fontSize:13,color:"#64748b"}}>
        <span style={{color:"#8b3230",fontWeight:700}}>Secretaria</span>
        <span style={{margin:"0 6px"}}>›</span>
        <span style={{fontWeight:600,color:"#1e293b"}}>{{
          ficha:"Ficha Cadastral",cargos:"Cargos",situacoes:"Situações",
          congregacoes:"Congregações",tiposadm:"Tipos de Admissão",histtipos:"Histórico Pastoral",
          grupos_cad:"Grupos › Cadastro",grupos_cat:"Grupos › Categorias",
          
          cartas:"Cartas",certs:"Certificados",config:"Configurações"
        }[secPage]||secPage}</span>
      </div>

      {/* ══════════════ MEMBROS ══════════════ */}
      {(secPage==="ficha"||secPage==="cargos"||secPage==="situacoes"||secPage==="congregacoes"||secPage==="tiposadm"||secPage==="histtipos") && (
        <div>


          {/* Lista de Membros */}
          {secPage==="ficha" && (
            <div>
              <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
                <input style={{...ST.inp,flex:1,minWidth:200}} placeholder="Pesquisar membro..."
                  value={search} onChange={e=>setSearch(e.target.value)}/>
                <span style={{background:"#f1f5f9",borderRadius:7,padding:"7px 14px",fontSize:12,color:"#64748b",fontWeight:700}}>{sorted.length} membros</span>
              </div>
              <div style={{background:"#fff",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"40px 46px 1fr 88px 72px 80px",gap:6,padding:"9px 14px",background:"#f8fafc",borderBottom:"2px solid #e2e8f0",fontSize:11,fontWeight:700,color:"#64748b"}}>
                  <div>N</div><div>Foto</div><div>Nome</div><div>Cargo</div><div>Status</div><div></div>
                </div>
                {sorted.length===0
                  ? <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}>Nenhum membro</div>
                  : sorted.map((m,i)=>(
                  <div key={m.id} style={{display:"grid",gridTemplateColumns:"40px 46px 1fr 88px 72px 80px",gap:6,padding:"9px 14px",borderBottom:"1px solid #f1f5f9",alignItems:"center",background:i%2===0?"#fff":"#fafafa"}}>
                    <div style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>{i+1}</div>
                    <div>{m.foto
                      ? <img src={m.foto} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover"}} alt=""/>
                      : <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#8b3230,#c9a84c)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:14}}>{m.nome[0]}</div>
                    }</div>
                    <div><div style={{fontWeight:600,fontSize:13,color:"#1e293b"}}>{m.nome}</div>
                      {m.ministerio&&m.ministerio!=="Nenhum"&&<div style={{fontSize:10,color:"#94a3b8"}}>{m.ministerio}</div>}
                    {m.congregacao&&<div style={{fontSize:9,color:"#7c3aed",fontWeight:600,marginTop:1}}>🏛 {m.congregacao.replace("ASSEMBLEIA DE DEUS DE DIADEMA - ","").replace("ASSEMBLEIA DE DEUS - ","")}</div>}
                    </div>
                    <div style={{fontSize:11,color:"#475569"}}>{m.cargo||"Membro"}</div>
                    <div><span style={{background:m.ativo?"#dcfce7":"#fee2e2",color:m.ativo?"#16a34a":"#dc2626",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700}}>{m.ativo?"Ativo":"Inativo"}</span></div>
                    <div><button onClick={()=>{
                      if(!window.confirm("Excluir "+m.nome+" permanentemente? Esta ação não pode ser desfeita.")) return;
                      const nova = members.filter(x=>x.id!==m.id);
                      setMembers(nova); save(nova);
                      showToast("Membro excluído.");
                    }} style={{background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:6,padding:"4px 9px",fontSize:11,fontWeight:700,cursor:"pointer"}}>🗑 Excluir</button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cargos */}
          {secPage==="cargos" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Cargos / Funcoes</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Novo cargo..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addStr(cargos,setCargos,"sec_cargos")}/>
                <button style={ST.btn()} onClick={()=>addStr(cargos,setCargos,"sec_cargos")}>+ Adicionar</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
                {cargos.map((c,i)=>(
                  <div key={i} style={ST.row(i)}>
                    <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{c}</span>
                    <button style={ST.del} onClick={()=>delStr(cargos,setCargos,"sec_cargos",i)}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Situações */}
          {secPage==="situacoes" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Situacoes</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Nova situacao..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addStr(situacoes.map(s=>s.nome),arr=>{
                    const novos=arr.map((n,i)=>({id:i+1,nome:n,aniversario:false,saida:false}));
                    setSituacoes(novos);saveLS("sec_situacoes",novos);
                  },"_")}/>
                <button style={ST.btn()} onClick={()=>{
                  if(!novoItem.trim())return;
                  const novo=[...situacoes,{id:Date.now(),nome:novoItem.trim(),aniversario:false,saida:false}];
                  setSituacoes(novo);saveLS("sec_situacoes",novo);setNovoItem("");showMsg("Adicionado!");
                }}>+ Adicionar</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 60px",gap:8,padding:"8px 14px",background:"#f8fafc",fontSize:11,fontWeight:700,color:"#64748b",borderBottom:"1px solid #e2e8f0"}}>
                  <div>Situacao</div><div>Carta Aniversario</div><div>Saida Definitiva</div><div></div>
                </div>
                {situacoes.map((s,i)=>(
                  <div key={s.id} style={{display:"grid",gridTemplateColumns:"1fr 110px 110px 60px",gap:8,padding:"9px 14px",borderBottom:"1px solid #f1f5f9",alignItems:"center",background:i%2===0?"#fff":"#fafafa"}}>
                    <span style={{fontSize:13,fontWeight:600}}>{s.nome}</span>
                    <span style={{fontSize:18,textAlign:"center"}}>{s.aniversario?"☑":"☐"}</span>
                    <span style={{fontSize:18,textAlign:"center"}}>{s.saida?"☑":"☐"}</span>
                    <button style={ST.del} onClick={()=>{
                      const novo=situacoes.filter(x=>x.id!==s.id);
                      setSituacoes(novo);saveLS("sec_situacoes",novo);showMsg("Removido!");
                    }}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Congregações */}
          {secPage==="congregacoes" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Congregacoes</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Nome da congregacao..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}/>
                <button style={ST.btn()} onClick={()=>{
                  if(!novoItem.trim())return;
                  const novo=[...congregacoes,{id:Date.now(),nome:novoItem.trim()}];
                  setCongregacoes(novo);saveLS("sec_congregacoes",novo);if(setCongregacoesApp)setCongregacoesApp(novo);setNovoItem("");showMsg("Adicionado!");
                }}>+ Adicionar</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
                {congregacoes.map((c,i)=>(
                  <div key={c.id} style={ST.row(i)}>
                    <span style={{fontSize:13,fontWeight:600}}>{c.nome}</span>
                    <button style={ST.del} onClick={()=>{
                      const novo=congregacoes.filter(x=>x.id!==c.id);
                      setCongregacoes(novo);saveLS("sec_congregacoes",novo);if(setCongregacoesApp)setCongregacoesApp(novo);showMsg("Removido!");
                    }}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tipos de Histórico Pastoral */}
          {secPage==="histtipos" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Tipos de Histórico Pastoral</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Novo tipo (ex: Visita)..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}/>
                <button style={ST.btn()} onClick={()=>addStr(catGrupos.length?catGrupos:[],setCatGrupos,"sec_histtipos")}>+ Adicionar</button>
              </div>
              {["Aconselhamento","Consolidacao","Visita"].map((t,i)=>(
                <div key={i} style={ST.row(i)}>
                  <span style={{fontSize:13,fontWeight:600}}>{t}</span>
                </div>
              ))}
            </Card>
          )}
          {/* Tipos de Admissão */}
          {secPage==="tiposadm" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Tipos de Admissao</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Novo tipo..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}/>
                <button style={ST.btn()} onClick={()=>addStr(tiposAdmissao,setTiposAdmissao,"sec_tiposadm")}>+ Adicionar</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
                {tiposAdmissao.map((t,i)=>(
                  <div key={i} style={ST.row(i)}>
                    <span style={{fontSize:13,fontWeight:600}}>{t}</span>
                    <button style={ST.del} onClick={()=>delStr(tiposAdmissao,setTiposAdmissao,"sec_tiposadm",i)}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════ GRUPOS ══════════════ */}
      {(secPage==="grupos_cad"||secPage==="grupos_cat") && (
        <div>


          {/* Cadastro de Grupos */}
          {secPage==="grupos_cad" && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Card>
                <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Novo Grupo</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Nome do Grupo</div>
                    <input style={ST.inp} placeholder="Ex: Adolescentes" value={novoGrupo.nome}
                      onChange={e=>setNovoGrupo(g=>({...g,nome:e.target.value}))}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Categoria</div>
                    <select style={ST.inp} value={novoGrupo.categoria} onChange={e=>setNovoGrupo(g=>({...g,categoria:e.target.value}))}>
                      <option value="">Selecione...</option>
                      {catGrupos.map((c,i)=><option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Lider</div>
                    <select style={ST.inp} value={novoGrupo.lider} onChange={e=>setNovoGrupo(g=>({...g,lider:e.target.value}))}>
                      <option value="">Selecione...</option>
                      {[...members].sort((a,b)=>a.nome.localeCompare(b.nome)).map(m=>(
                        <option key={m.id} value={m.nome}>{m.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button style={ST.btn()} onClick={()=>{
                  if(!novoGrupo.nome.trim()){showToast("Informe o nome","error");return;}
                  const novo=[...grupos,{id:Date.now(),...novoGrupo}];
                  setGrupos(novo);saveLS("sec_grupos",novo);setNovoGrupo({nome:"",categoria:"",lider:""});showMsg("Grupo criado!");
                }}>+ Criar Grupo</button>
              </Card>
              <div style={{background:"#fff",borderRadius:12,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 130px 1fr 80px",gap:8,padding:"9px 14px",background:"#f8fafc",borderBottom:"2px solid #e2e8f0",fontSize:11,fontWeight:700,color:"#64748b"}}>
                  <div>Grupo</div><div>Categoria</div><div>Lider</div><div>Acao</div>
                </div>
                {grupos.length===0
                  ? <div style={{textAlign:"center",padding:30,color:"#94a3b8"}}>Nenhum grupo cadastrado</div>
                  : grupos.map((g,i)=>(
                  <div key={g.id} style={{display:"grid",gridTemplateColumns:"1fr 130px 1fr 80px",gap:8,padding:"9px 14px",borderBottom:"1px solid #f1f5f9",alignItems:"center",background:i%2===0?"#fff":"#fafafa"}}>
                    <span style={{fontWeight:600,fontSize:13}}>{g.nome}</span>
                    <span style={{fontSize:11,color:"#64748b"}}>{g.categoria||"-"}</span>
                    <span style={{fontSize:12}}>{g.lider||"-"}</span>
                    <button style={ST.del} onClick={()=>{
                      const novo=grupos.filter(x=>x.id!==g.id);
                      setGrupos(novo);saveLS("sec_grupos",novo);showMsg("Removido!");
                    }}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categorias */}
          {secPage==="grupos_cat" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Categorias de Grupos</div>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <input style={{...ST.inp,flex:1}} placeholder="Nova categoria..." value={novoItem} onChange={e=>setNovoItem(e.target.value)}/>
                <button style={ST.btn()} onClick={()=>addStr(catGrupos,setCatGrupos,"sec_catgrupos")}>+ Adicionar</button>
              </div>
              <div style={{background:"#fff",borderRadius:10,overflow:"hidden",border:"1px solid #e2e8f0"}}>
                {catGrupos.map((c,i)=>(
                  <div key={i} style={ST.row(i)}>
                    <span style={{fontSize:13,fontWeight:600}}>{c}</span>
                    <button style={ST.del} onClick={()=>delStr(catGrupos,setCatGrupos,"sec_catgrupos",i)}>🗑</button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════ ESCALAS ══════════════ */}

            {/* ══════════════ CARTAS ══════════════ */}
      {secPage==="cartas" && (
        <div style={{maxWidth:560}}>
          <Card>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Gerar Carta</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {[["batismo","Batismo"],["membresia","Membresia"],["recomendacao","Recomendacao"],
                ["nascimento","Nasc. Espiritual"],["mudanca","Mudanca"],["convertido","Novo Convertido"]].map(([v,l])=>(
                <button key={v} onClick={()=>setDocTipo(v)} style={{
                  padding:"7px 12px",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:12,
                  background:docTipo===v?"#8b3230":"#f1f5f9",color:docTipo===v?"#fff":"#64748b"
                }}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Membro</div>
                <select style={ST.inp} value={certMembro} onChange={e=>setCertMembro(e.target.value)}>
                  <option value="">Selecione...</option>
                  {[...members].sort((a,b)=>a.nome.localeCompare(b.nome)).map(m=>(
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Data do Evento</div>
                  <input type="date" style={ST.inp} value={certData} onChange={e=>setCertData(e.target.value)}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Pastor</div>
                  <input style={ST.inp} value={certPastor||config.pastor||""} onChange={e=>setCertPastor(e.target.value)} placeholder="Nome do pastor"/>
                </div>
              </div>
              <button style={{...ST.btn(),padding:"10px",fontSize:14}} onClick={()=>gerarDocumento(docTipo)}>
                🖨️ Gerar e Imprimir
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ CERTIFICADOS ══════════════ */}
      {secPage==="certs" && (
        <div style={{maxWidth:560}}>
          <Card>
            <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:"#1e293b"}}>Gerar Certificado</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              {[["batismo","Batismo"],["membresia","Membresia"]].map(([v,l])=>(
                <button key={v} onClick={()=>setCertTipo(v)} style={{
                  padding:"7px 12px",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:12,
                  background:certTipo===v?"#7c3aed":"#f1f5f9",color:certTipo===v?"#fff":"#64748b"
                }}>{l}</button>
              ))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Membro</div>
                <select style={ST.inp} value={certMembro} onChange={e=>setCertMembro(e.target.value)}>
                  <option value="">Selecione...</option>
                  {[...members].sort((a,b)=>a.nome.localeCompare(b.nome)).map(m=>(
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Data</div>
                  <input type="date" style={ST.inp} value={certData} onChange={e=>setCertData(e.target.value)}/>
                </div>
                <div>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>Pastor</div>
                  <input style={ST.inp} value={certPastor||config.pastor||""} onChange={e=>setCertPastor(e.target.value)} placeholder="Nome do pastor"/>
                </div>
              </div>
              <button style={{...ST.btn("#7c3aed"),padding:"10px",fontSize:14}} onClick={()=>gerarDocumento(certTipo)}>
                📜 Gerar e Imprimir
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ══════════════ CONFIGURAÇÕES ══════════════ */}
      {secPage==="config" && (
        <div style={{maxWidth:600}}>
          <Card>
            <div style={{fontWeight:700,fontSize:14,marginBottom:14,color:"#1e293b"}}>Dados da Igreja</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["nomeIgreja","Nome da Igreja"],["cnpj","CNPJ"],["pastor","Pastor Presidente"],
                ["telefone","Telefone"],["email","E-mail"],["endereco","Endereco"],["cidade","Cidade"],["cep","CEP"]
              ].map(([k,l])=>(
                <div key={k} style={{gridColumn:k==="endereco"||k==="nomeIgreja"?"1/-1":"auto"}}>
                  <div style={{fontSize:11,color:"#64748b",fontWeight:600,marginBottom:3}}>{l}</div>
                  <input style={ST.inp} value={config[k]||""} onChange={e=>setConfig(c=>({...c,[k]:e.target.value}))} placeholder={l}/>
                </div>
              ))}
            </div>
            <div style={{marginTop:14}}>
              <button style={ST.btn()} onClick={()=>{
                try{localStorage.setItem("church_config",JSON.stringify(config));}catch(e){}
                showMsg("Configuracoes salvas!");
              }}>Salvar</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}


function ModalNovoAdmin({members, formAdmin, setFormAdmin, onClose, onSalvar, INP}) {
  const [busca, setBusca] = React.useState("");
  const sugestoes = busca.length >= 2
    ? members.filter(m => m.nome?.toLowerCase().includes(busca.toLowerCase())).slice(0,5)
    : [];
  return (
    React.createElement(Modal,{onClose,width:400},
      React.createElement("div",{style:{fontWeight:700,fontSize:17,marginBottom:4}},"\uD83D\uDC6E Novo Administrador"),
      React.createElement("div",{style:{fontSize:12,color:"#64748b",marginBottom:18}},
        "Busque um membro j\u00E1 cadastrado ou preencha manualmente."
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        React.createElement(Field,{label:"Buscar membro cadastrado"},
          React.createElement("div",{style:{position:"relative"}},
            React.createElement("input",{style:INP, value:busca,
              onChange:e=>setBusca(e.target.value),
              placeholder:"Digite o nome do membro\u2026"}),
            sugestoes.length>0 && React.createElement("div",{style:{
              position:"absolute",top:"100%",left:0,right:0,zIndex:99,
              border:"1px solid #e2e8f0",borderRadius:10,marginTop:4,overflow:"hidden",
              background:"#fff",boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}},
              sugestoes.map(m=>React.createElement("div",{
                key:m.id,
                onClick:()=>{setFormAdmin(f=>({...f,nome:m.nome}));setBusca("");},
                style:{padding:"10px 14px",cursor:"pointer",fontSize:13,
                  borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10,background:"#fff"},
                onMouseEnter:e=>e.currentTarget.style.background="#f8fafc",
                onMouseLeave:e=>e.currentTarget.style.background="#fff",
              },
                React.createElement("div",{style:{width:32,height:32,borderRadius:"50%",flexShrink:0,
                  background:"linear-gradient(135deg,#8b3230,#5c1a18)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontSize:12,fontWeight:700}}, m.nome[0]?.toUpperCase()),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontWeight:600,color:"#1e293b",fontSize:13}},m.nome),
                  React.createElement("div",{style:{fontSize:11,color:"#94a3b8"}},m.departamento||m.cargo||"Membro")
                )
              ))
            )
          )
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,color:"#94a3b8",fontSize:12}},
          React.createElement("div",{style:{flex:1,height:1,background:"#e2e8f0"}}),
          "ou preencha manualmente",
          React.createElement("div",{style:{flex:1,height:1,background:"#e2e8f0"}})
        ),
        React.createElement(Field,{label:"Nome do Admin"},
          React.createElement("input",{
            style:{...INP,background:formAdmin.nome?"#f0fdf4":"#fff",border:formAdmin.nome?"1.5px solid #86efac":"1.5px solid #e2e8f0"},
            value:formAdmin.nome,
            onChange:e=>setFormAdmin(f=>({...f,nome:e.target.value})),
            placeholder:"Nome completo"}),
          formAdmin.nome && React.createElement("div",{style:{fontSize:11,color:"#16a34a",marginTop:3}},
            "\u2713 "+formAdmin.nome)
        ),
        React.createElement(Field,{label:"PIN de acesso (4\u20136 d\u00EDgitos)"},
          React.createElement("input",{type:"password",inputMode:"numeric",maxLength:6,style:INP,
            value:formAdmin.pin,
            onChange:e=>setFormAdmin(f=>({...f,pin:e.target.value.replace(/\D/g,"")})),
            placeholder:"Ex: 1234"}),
          React.createElement("div",{style:{fontSize:11,color:"#94a3b8",marginTop:3}},
            "Informe um PIN que s\u00F3 essa pessoa saber\u00E1")
        )
      ),
      React.createElement("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20}},
        React.createElement(Btn,{color:"gray",onClick:onClose},"Cancelar"),
        React.createElement(Btn,{color:"purple",onClick:onSalvar},"\u2713 Criar Admin")
      )
    )
  );
}

function AdminView({currentUser, showToast, members, setMembers, save}) {
  const [sub, setSub] = useState("dashboard");
  const [admins, setAdmins] = useState([]);
  const [authData, setAuthData] = useState(null);
  const [saidas, setSaidas] = useState([]);
  const [audit, setAudit] = useState([]);
  const [modalAdmin, setModalAdmin] = useState(false);
  const [modalPin, setModalPin] = useState(false);
  const [formAdmin, setFormAdmin] = useState({nome:"",pin:""});
  const [newPin, setNewPin] = useState("");
  const [confPin, setConfPin] = useState("");
  const [modalPromover, setModalPromover] = useState(null); // {user} aguardando confirmação
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinConfirmErro, setPinConfirmErro] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const ra = await storageGet("church_auth");
        if (ra?.value) {
          const parsed = JSON.parse(ra.value);
          setAdmins(parsed.admins || []);
          setAuthData(parsed);
        }
        const rsL = localStorage.getItem("church_saidas"); const rs = rsL ? {value:rsL} : await window.storage.get("church_saidas").catch(()=>null);
        if (rs?.value) setSaidas(JSON.parse(rs.value));
        const rlL = localStorage.getItem("church_audit"); const rl = rlL ? {value:rlL} : await window.storage.get("church_audit").catch(()=>null);
        if (rl?.value) setAudit(JSON.parse(rl.value));
      } catch(e) {}
    })();
  }, []);

  async function saveAdmins(list) {
    try {
      const ra = await storageGet("church_auth");
      const d = ra?.value ? JSON.parse(ra.value) : {};
      const updated = {...d, admins:list};
      // Salvar em todos os storages
      await storageSet("church_auth", JSON.stringify(updated));
      localStorage.setItem("church_auth", JSON.stringify(updated));
      await fbSet("church_auth", updated);
    } catch(e) {}
  }

  async function addAudit(acao, detalhe) {
    const entry = {id:Date.now(), acao, detalhe, admin:currentUser.nome, data:new Date().toLocaleString("pt-BR")};
    const updated = [entry, ...audit].slice(0, 100);
    setAudit(updated);
    try { localStorage.setItem("church_audit", JSON.stringify(updated)); } catch(e) {} try { await window.storage.set("church_audit", JSON.stringify(updated)); } catch(e) {}
  }

  async function criarAdmin() {
    if (!formAdmin.nome || formAdmin.pin.length < 4) { showToast("Nome e PIN minimo 4 digitos", "error"); return; }
    if (!/^\d+$/.test(formAdmin.pin)) { showToast("PIN so numeros", "error"); return; }
    const novo = {id:Date.now(), nome:formAdmin.nome, pin:hashPin(formAdmin.pin), nivel:"admin"};
    const updated = [...admins, novo];
    setAdmins(updated); await saveAdmins(updated);
    await addAudit("Novo admin criado", formAdmin.nome);
    showToast("Admin criado!"); setModalAdmin(false); setFormAdmin({nome:"",pin:""});
  }

  async function removerAdmin(id) {
    if (id === currentUser.id) { showToast("Nao pode remover a si mesmo","error"); return; }
    const updated = admins.filter(a => a.id !== id);
    setAdmins(updated); await saveAdmins(updated);
    await addAudit("Admin removido","id "+id);
    showToast("Removido","error");
  }

  async function alterarPin() {
    if (newPin.length < 4) { showToast("Minimo 4 digitos","error"); return; }
    if (!/^\d+$/.test(newPin)) { showToast("Apenas numeros","error"); return; }
    if (newPin !== confPin) { showToast("PINs nao coincidem","error"); return; }
    const updated = admins.map(a => a.id===currentUser.id ? {...a, pin:hashPin(newPin), pinTrocado:true} : a);
    setAdmins(updated);
    await saveAdmins(updated);
    currentUser.pinTrocado = true;
    await addAudit("PIN alterado", currentUser.nome);
    showToast("PIN alterado com sucesso!"); setModalPin(false); setNewPin(""); setConfPin("");
  }


  async function exportarDados() {
    try {
      const membersData = await loadEncrypted("church_members") || [];
      const criancasData = await loadEncrypted("church_criancas") || [];
      const exportObj = {
        versao: "1.0",
        exportadoEm: new Date().toISOString(),
        exportadoPor: currentUser.nome,
        totalMembros: membersData.length,
        totalCriancas: criancasData.length,
        membros: membersData,
        criancas: criancasData,
      };
      // Criptografar o export com senha derivada do PIN hash
      const json = JSON.stringify(exportObj, null, 2);
      const blob = new Blob([json], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ad-diadema-backup-" + new Date().toISOString().slice(0,10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      await addAudit("Exportacao de dados", currentUser.nome + " - " + membersData.length + " membros");
      showToast("Backup exportado com sucesso!");
    } catch(e) {
      showToast("Erro ao exportar", "error");
    }
  }

  async function importarDados(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.membros) { showToast("Arquivo inválido","error"); return; }
      if (data.membros.length > 0) {
        await saveEncrypted("church_members", data.membros);
        setMembers(data.membros);
      }
      if (data.criancas?.length > 0) {
        await saveEncrypted("church_criancas", data.criancas);
      }
      await addAudit("Importacao de dados", data.membros.length + " membros importados");
      showToast(data.membros.length + " membros importados!");
    } catch(e) {
      showToast("Erro ao importar arquivo","error");
    }
  }

  async function aprovarSaida(id) {
    const sol = saidas.find(s => s.id===id);
    const updS = saidas.map(s => s.id===id ? {...s,status:"aprovado",por:currentUser.nome,em:hoje()} : s);
    const updM = members.map(m => m.id===sol.membroId ? {...m,ativo:false,historicoSaida:[...(m.historicoSaida||[]),{...sol,status:"aprovado",por:currentUser.nome}]} : m);
    setSaidas(updS); try { localStorage.setItem("church_saidas",JSON.stringify(updS)); } catch(e) {} try { await window.storage.set("church_saidas",JSON.stringify(updS)); } catch(e) {}
    setMembers(updM); await save(updM);
    await addAudit("Saida aprovada", sol.membroNome+" - "+sol.motivo);
    showToast("Saida aprovada e membro inativado");
  }

  async function rejeitarSaida(id) {
    const sol = saidas.find(s => s.id===id);
    const updated = saidas.map(s => s.id===id ? {...s,status:"rejeitado",por:currentUser.nome} : s);
    setSaidas(updated); try { localStorage.setItem("church_saidas",JSON.stringify(updated)); } catch(e) {} try { await window.storage.set("church_saidas",JSON.stringify(updated)); } catch(e) {}
    await addAudit("Saida rejeitada", sol.membroNome);
    showToast("Rejeitado","warn");
  }

  const pendentes = saidas.filter(s => s.status==="pendente");

  return (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:18,background:"#fff",borderRadius:12,padding:6,boxShadow:"0 1px 4px rgba(0,0,0,0.06)",flexWrap:"wrap"}}>
        {[{id:"dashboard",l:"Painel"},{id:"saidas",l:`Saidas${pendentes.length?" ("+pendentes.length+")":""}`},{id:"admins",l:`Admins${(authData?.users||[]).length > 0 ? " ("+authData.users.length+" 👥)" : ""}`},{id:"audit",l:"Auditoria"}].map(t => (
          <button key={t.id} onClick={async()=>{ setSub(t.id); if(t.id==="admins"){ const ra=await storageGet("church_auth"); if(ra?.value){const p=JSON.parse(ra.value); setAuthData(p); setAdmins(p.admins||[]);} } }} style={{padding:"7px 16px",border:"none",cursor:"pointer",fontWeight:600,fontSize:13,borderRadius:8,background:sub===t.id?"linear-gradient(135deg,#7c3aed,#6d28d9)":"transparent",color:sub===t.id?"#fff":"#64748b",transition:"all 0.2s"}}>
            {t.l}
          </button>
        ))}
      </div>

      {sub==="dashboard" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
            {[{l:"Total",v:members.length,c:"#2563eb"},{l:"Ativos",v:members.filter(m=>m.ativo).length,c:"#059669"},{l:"Inativos",v:members.filter(m=>!m.ativo).length,c:"#64748b"},{l:"Saidas Pendentes",v:pendentes.length,c:"#dc2626"}].map(s => (
              <Card key={s.l} border={`3px solid ${s.c}33`}>
                <div style={{fontSize:24,fontWeight:800,color:s.c}}>{s.v}</div>
                <div style={{fontSize:11,color:"#94a3b8",fontWeight:500,marginTop:2}}>{s.l}</div>
              </Card>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#374151"}}>Por Cargo</div>
              {CARGOS.map(c => { const n=members.filter(m=>m.cargo===c&&m.ativo).length; if(!n) return null; return (
                <div key={c} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{flex:1,fontSize:13}}>{c}</div>
                  <div style={{background:"#eff6ff",borderRadius:20,padding:"1px 8px",fontSize:12,fontWeight:700,color:"#2563eb"}}>{n}</div>
                </div>
              ); })}
            </Card>
            <Card>
              <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:"#374151"}}>Por Ministerio</div>
              {MINISTERIOS.filter(m=>m!=="Nenhum").map(m => { const n=members.filter(mb=>mb.ministerio===m&&mb.ativo).length; if(!n) return null; return (
                <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
                  <div style={{flex:1,fontSize:13}}>{m}</div>
                  <div style={{background:"#f0fdf4",borderRadius:20,padding:"1px 8px",fontSize:12,fontWeight:700,color:"#059669"}}>{n}</div>
                </div>
              ); })}
            </Card>
          </div>
        </div>
      )}

      {sub==="saidas" && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Controle de Saida de Membros</div>
          {pendentes.length > 0 && (
            <div style={{marginBottom:18}}>
              <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>AGUARDANDO APROVACAO ({pendentes.length})</div>
              {pendentes.map(sol => (
                <Card key={sol.id} gap={10} border="2px solid #fecaca">
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:14}}>{sol.membroNome}</div>
                      <div style={{fontSize:13,color:"#64748b",marginTop:2}}>Motivo: {sol.motivo}</div>
                      <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>Solicitado em {ptDate(sol.em)} por {sol.por}</div>
                      {sol.obs && <div style={{marginTop:6,padding:"5px 9px",background:"#fef9c3",borderRadius:6,fontSize:12,color:"#78350f"}}>{sol.obs}</div>}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn color="red" size="sm" onClick={() => rejeitarSaida(sol.id)}>Rejeitar</Btn>
                      <Btn color="blue" size="sm" onClick={() => aprovarSaida(sol.id)}>Aprovar Saida</Btn>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div style={{fontSize:12,fontWeight:700,color:"#64748b",marginBottom:8}}>HISTORICO</div>
          {saidas.filter(s=>s.status!=="pendente").length===0
            ? <Card><div style={{textAlign:"center",padding:28,color:"#94a3b8",fontSize:13}}>Nenhuma saida registrada.</div></Card>
            : saidas.filter(s=>s.status!=="pendente").sort((a,b)=>b.id-a.id).map(sol => (
              <Card key={sol.id} gap={8}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{sol.membroNome}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>Motivo: {sol.motivo}  ·  {ptDate(sol.em)}</div>
                  </div>
                  <span style={{background:sol.status==="aprovado"?"#dcfce7":"#fee2e2",color:sol.status==="aprovado"?"#16a34a":"#dc2626",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>
                    {sol.status==="aprovado"?"Aprovado":"Rejeitado"}
                  </span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {sub==="admins" && (
        <div>

          {currentUser.nivel==="super" && (
            <Card>
              <div style={{fontWeight:700,fontSize:14,marginBottom:12}}>🛡️ Segurança & Backup (LGPD)</div>
              <div style={{fontSize:12,color:"#64748b",marginBottom:14,padding:"8px 12px",background:"#f8fafc",borderRadius:8,borderLeft:"3px solid #8b3230"}}>
                Dados dos membros armazenados com <strong>criptografia AES-256</strong>. Sessão expira automaticamente após 10 minutos de inatividade.
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <Btn color="blue" onClick={exportarDados}>⬇️ Exportar Backup</Btn>
                <label style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 16px",background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
                  ⬆️ Importar Backup
                  <input type="file" accept=".json" style={{display:"none"}} onChange={e => e.target.files[0] && importarDados(e.target.files[0])} />
                </label>
              </div>
            </Card>
          )}

          {/* ── USUÁRIOS: promover a admin ── */}
          {(() => {
            const users = authData?.users || [];
            return (
              <Card style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>👥</span>
                    <div style={{fontWeight:700,fontSize:14,color:"#1e293b"}}>
                      Usuários Cadastrados ({users.length})
                    </div>
                  </div>
                  <button onClick={async()=>{ const ra=await storageGet("church_auth"); if(ra?.value){const p=JSON.parse(ra.value); setAuthData(p); setAdmins(p.admins||[]); showToast("Atualizado!");}}} style={{padding:"5px 12px",border:"none",borderRadius:8,background:"#f1f5f9",color:"#64748b",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    🔄 Atualizar
                  </button>
                </div>
                {users.length===0 && (
                  <div style={{textAlign:"center",padding:"20px",color:"#94a3b8",fontSize:13}}>
                    <div style={{fontSize:32,marginBottom:8}}>👤</div>
                    Nenhum usuário cadastrado ainda.<br/>
                    <span style={{fontSize:11}}>Usuários que se cadastrarem pelo app aparecerão aqui.</span>
                  </div>
                )}
                {users.map(u => (
                  <div key={u.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",
                    borderBottom:"1px solid #f1f5f9"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:700,flexShrink:0}}>
                      {u.nome[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:"#1e293b"}}>{u.nome}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{u.cargo||"Membro"} · {u.cadastradoEm||""}</div>
                    </div>
                    <button onClick={()=>{ setModalPromover(u); setPinConfirm(""); setPinConfirmErro(""); }}
                      style={{padding:"6px 14px",borderRadius:8,border:"none",
                      background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",
                      fontWeight:700,fontSize:12,cursor:"pointer",flexShrink:0}}>
                      ⬆️ Promover
                    </button>
                  </div>
                ))}
              </Card>
            );
          })()}

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{fontWeight:700,fontSize:15}}>Administradores</div>
            <div style={{display:"flex",gap:8}}>
              {(() => {
                const eu = admins.find(a => a.id === currentUser.id);
                if (eu?.pinTrocado || currentUser.pinTrocado) {
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:"#f1f5f9",borderRadius:8,fontSize:12,color:"#94a3b8",fontWeight:500}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      PIN ja definido
                    </div>
                  );
                }
                return <Btn color="gray" size="sm" onClick={() => setModalPin(true)}>Alterar meu PIN</Btn>;
              })()}
              {currentUser.nivel==="super" && <Btn color="purple" size="sm" onClick={() => { setFormAdmin({nome:"",pin:""}); setModalAdmin(true); }}>+ Novo Admin</Btn>}
            </div>
          </div>
          {admins.map(a => (
            <Card key={a.id} gap={10}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:"50%",background:a.nivel==="super"?"linear-gradient(135deg,#7c3aed,#6d28d9)":"linear-gradient(135deg,#742a28,#5c1a18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>👮</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:14}}>{a.nome}</span>
                    <span style={{background:a.nivel==="super"?"#f3e8ff":"#eff6ff",color:a.nivel==="super"?"#7c3aed":"#2563eb",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:600}}>{a.nivel==="super"?"Super Admin":"Admin"}</span>
                    {a.id===currentUser.id && <span style={{background:"#dcfce7",color:"#16a34a",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:600}}>Voce</span>}
                  </div>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>PIN: ••••</div>
                </div>
                {currentUser.nivel==="super" && a.id!==currentUser.id && <Btn color="red" size="sm" onClick={() => removerAdmin(a.id)}>Remover</Btn>}
              </div>
            </Card>
          ))}
        </div>
      )}


      {sub==="acesso" && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>Log de Acesso</span>
            <span style={{fontSize:12,color:"#94a3b8",fontWeight:400}}>Últimos 500 registros · dados criptografados</span>
          </div>
          <AccessLogView />
        </div>
      )}

      {sub==="audit" && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Log de Auditoria</div>
          {audit.length===0
            ? <Card><div style={{textAlign:"center",padding:28,color:"#94a3b8"}}>Nenhuma acao registrada.</div></Card>
            : audit.map(l => (
              <div key={l.id} style={{display:"flex",gap:10,padding:"9px 14px",background:"#fff",borderRadius:8,marginBottom:4,boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,color:"#94a3b8",whiteSpace:"nowrap",marginTop:2,minWidth:90}}>{l.data}</div>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600,fontSize:13}}>{l.acao}</span>
                  {l.detalhe && <span style={{fontSize:12,color:"#64748b",marginLeft:5}}> — {l.detalhe}</span>}
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>por {l.admin}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* MODAL: confirmar promoção com PIN do super admin */}
      {modalPromover && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:360,
            boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{width:56,height:56,borderRadius:"50%",
                background:"linear-gradient(135deg,#7c3aed,#5b21b6)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 12px"}}>🔐</div>
              <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Confirmar Promoção</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:4}}>
                Promover <strong>{modalPromover.nome}</strong> a Admin
              </div>
            </div>
            <div style={{background:"#f5f3ff",borderRadius:14,padding:"12px 14px",
              marginBottom:18,border:"1px solid #ede9fe"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7c3aed",letterSpacing:0.8,marginBottom:4}}>USUÁRIO</div>
              <div style={{fontWeight:600,fontSize:13,color:"#1e293b"}}>{modalPromover.nome}</div>
              <div style={{fontSize:11,color:"#64748b"}}>{modalPromover.cargo||"Membro"} · PIN de acesso já definido ✅</div>
            </div>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:8}}>
                SEU PIN — confirmação de segurança
              </div>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Digite seu PIN"
                value={pinConfirm}
                onChange={e=>{ setPinConfirm(e.target.value); setPinConfirmErro(""); }}
                style={{width:"100%",padding:"12px 14px",
                  border:`2px solid ${pinConfirmErro?"#ef4444":"#e2e8f0"}`,
                  borderRadius:12,fontSize:20,textAlign:"center",letterSpacing:8,
                  outline:"none",fontWeight:700,color:"#1e293b",boxSizing:"border-box"}}
              />
              {pinConfirmErro && (
                <div style={{color:"#ef4444",fontSize:12,marginTop:6,textAlign:"center",fontWeight:600}}>
                  ❌ {pinConfirmErro}
                </div>
              )}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{ setModalPromover(null); setPinConfirm(""); setPinConfirmErro(""); }}
                style={{flex:1,padding:"12px",border:"1.5px solid #e2e8f0",borderRadius:12,
                  background:"#f8fafc",color:"#64748b",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={async()=>{
                if(!pinConfirm){ setPinConfirmErro("Digite seu PIN"); return; }
                const r = await storageGet("church_auth");
                if(!r?.value){ setPinConfirmErro("Erro ao verificar"); return; }
                const auth = JSON.parse(r.value);
                // Verificar PIN do admin logado (busca em admins ou fallback super 5779)
                const meAdmin = (auth.admins||[]).find(a=>a.id===currentUser.id);
                const pinHash = meAdmin?.pin ?? hashPin("5779");
                if(hashPin(pinConfirm) !== pinHash){
                  setPinConfirmErro("PIN incorreto. Tente novamente.");
                  setPinConfirm("");
                  return;
                }
                // Promover mantendo PIN original do usuário (já em hash no cadastro)
                const promovido = {...modalPromover, nivel:"admin", cadastroCompleto:true};
                const novosAdmins = [...(auth.admins||[]), promovido];
                const novosUsers  = (auth.users||[]).filter(x=>x.id!==modalPromover.id);
                const novoAuth = {...auth, admins:novosAdmins, users:novosUsers};
                // Salvar em TODOS os storages para persistir
                await storageSet("church_auth", JSON.stringify(novoAuth));
                localStorage.setItem("church_auth", JSON.stringify(novoAuth));
                await fbSet("church_auth", novoAuth);
                setAuthData(novoAuth); setAdmins(novosAdmins);
                showToast("✅ "+modalPromover.nome+" promovido a Admin!");
                setModalPromover(null); setPinConfirm(""); setPinConfirmErro("");
              }}
                style={{flex:1,padding:"12px",border:"none",borderRadius:12,
                  background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff",
                  fontWeight:700,fontSize:13,cursor:"pointer"}}>
                ✅ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAdmin && (
        <ModalNovoAdmin
          members={members}
          formAdmin={formAdmin}
          setFormAdmin={setFormAdmin}
          onClose={()=>setModalAdmin(false)}
          onSalvar={criarAdmin}
          INP={INP}
        />
      )}

      {modalPin && (
        <Modal onClose={() => setModalPin(false)} width={340}>
          <div style={{fontWeight:700,fontSize:17,marginBottom:18}}>Alterar PIN</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Novo PIN (4-6 digitos)"><input type="password" inputMode="numeric" maxLength={6} style={INP} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))} placeholder="****" /></Field>
            <Field label="Confirmar PIN"><input type="password" inputMode="numeric" maxLength={6} style={INP} value={confPin} onChange={e=>setConfPin(e.target.value.replace(/\D/g,""))} placeholder="****" /></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18}}>
            <Btn color="gray" onClick={() => setModalPin(false)}>Cancelar</Btn>
            <Btn color="blue" onClick={alterarPin}>Salvar PIN</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MEMBROS ────────────────────────────────────────────────────────────────────
function FamiliaTab({form, hf, members}) {
  const [filhosVinc, setFilhosVinc] = React.useState([]);
  useEffect(() => {
    (async () => {
      try {
        const raw = await window.storage.get("church_criancas");
        const all = raw ? JSON.parse(raw.value) : [];
        if (form.id) setFilhosVinc(all.filter(c => c.membroId === form.id));
        else setFilhosVinc([]);
      } catch(e) { setFilhosVinc([]); }
    })();
  }, [form.id]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <Field label="Conjuge">
        <input style={INP} value={form.conjugeNome} onChange={e=>hf("conjugeNome",e.target.value)} placeholder="Nome do conjuge"/>
      </Field>
      <Field label="Filhos (texto livre)">
        <textarea style={{...INP,minHeight:56,resize:"vertical"}} value={form.filhos} onChange={e=>hf("filhos",e.target.value)} placeholder="Ex: Joao (10), Maria (7)..."/>
      </Field>
      {form.id && (
        <div>
          <div style={{fontSize:12,color:"#64748b",fontWeight:600,marginBottom:8}}>Filhos cadastrados no Infantil</div>
          {filhosVinc.length === 0 ? (
            <div style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>
              Nenhuma crianca vinculada a este membro no Infantil ainda.
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {filhosVinc.map(c => (
                <div key={c.id} style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                  {c.foto ? <img src={c.foto} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt="foto"/> : <div style={{width:36,height:36,borderRadius:"50%",background:"#4ade80",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>baby</div>}
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:"#15803d"}}>{c.nome}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{c.nascimento ? c.nascimento.split("-").reverse().join("/") : ""}{c.sexo ? " - "+c.sexo : ""}{c.checkin ? " (Na salinha)" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{fontSize:11,color:"#94a3b8",marginTop:6}}>Para vincular va em Infantil e selecione este membro como responsavel.</div>
        </div>
      )}
      {!form.id && <div style={{background:"#fef9c3",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e"}}>Salve o membro primeiro para ver filhos vinculados no Infantil.</div>}
    </div>
  );
}
