// ═══ oracao.js — OracaoView, mural de orações ═══

function OracaoView({user, showToast}) {
  const EMPTY = {motivo:"", nome: user?.nome||"", descricao:"", visita:false, ligacao:false, anonimo:false};
  const [form, setForm] = React.useState(EMPTY);
  const [enviados, setEnviados] = React.useState(()=>{
    try{ const r=localStorage.getItem("church_oracoes"); return r?JSON.parse(r):[]; }catch(e){return [];}
  });
  const [view, setView] = React.useState("lista"); // lista | form | mural
  const [confirmDel, setConfirmDel] = React.useState(null);

  // Sync Firebase ao montar
  React.useEffect(()=>{
    (async()=>{
      try{
        const fb = await fbGet("church/oracoes");
        if(fb && Array.isArray(fb) && fb.length > 0){
          setEnviados(fb);
          try{localStorage.setItem("church_oracoes",JSON.stringify(fb));}catch(e){}
        }
      }catch(e){}
    })();
  },[]);

  function saveOracoes(lista) {
    setEnviados(lista);
    try{localStorage.setItem("church_oracoes",JSON.stringify(lista));}catch(e){}
    try{fbSet("church/oracoes", lista);}catch(e){}
  }

  function salvar() {
    if(!form.motivo.trim()){showToast("Informe o motivo","error");return;}
    if(!form.descricao.trim()){showToast("Descreva o pedido","error");return;}
    const novo = {...form, id:Date.now(), em:new Date().toLocaleString("pt-BR"), status:"pendente", autorId:user?.id};
    saveOracoes([novo,...enviados]);
    showToast("🙏 Pedido enviado! Estaremos orando por você.");
    setForm(EMPTY); setView("lista");
  }

  function excluir(id) {
    saveOracoes(enviados.filter(p=>p.id!==id));
    setConfirmDel(null);
    showToast("Pedido removido");
  }

  const MOTIVOS = ["Saúde","Família","Finanças","Trabalho","Relacionamento","Libertação","Salvação de familiar","Outro"];
  const podeExcluir = (p) => p.autorId===user?.id || user?.nivel==="super" || user?.nivel==="admin";

  // ── FORMULÁRIO ──
  if(view==="form") return (
    <div style={{padding:"0 16px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>setView("lista")} style={{background:"#f1f5f9",border:"none",borderRadius:20,
          padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center",gap:4}}>
          ← Voltar
        </button>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Pedido de Oração</div>
      </div>
      <div style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",borderRadius:18,
        padding:"20px",marginBottom:20,textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
        <div style={{fontSize:36,marginBottom:6}}>🙏</div>
        <div style={{color:"#fff",fontWeight:700,fontSize:16}}>Compartilhe sua prece</div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:4}}>Estaremos orando por você</div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:8}}>MOTIVO DA ORAÇÃO *</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {MOTIVOS.map(m=>(
            <button key={m} onClick={()=>setForm(f=>({...f,motivo:m}))} style={{
              padding:"7px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,
              background:form.motivo===m?"#7c3aed":"#f1f5f9",
              color:form.motivo===m?"#fff":"#475569",transition:"all .15s"
            }}>{m}</button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:6}}>SEU NOME</div>
        <input style={{width:"100%",padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:12,
          fontSize:14,outline:"none",background:form.anonimo?"#f8fafc":"#fff",color:form.anonimo?"#94a3b8":"#1e293b",boxSizing:"border-box"}}
          value={form.anonimo?"Anônimo":form.nome}
          onChange={e=>setForm(f=>({...f,nome:e.target.value}))}
          disabled={form.anonimo} placeholder="Seu nome"/>
        <label style={{display:"flex",alignItems:"center",gap:6,marginTop:6,cursor:"pointer"}}>
          <input type="checkbox" checked={form.anonimo} onChange={e=>setForm(f=>({...f,anonimo:e.target.checked}))}/>
          <span style={{fontSize:12,color:"#64748b"}}>Enviar anonimamente</span>
        </label>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:6}}>DESCREVA SEU PEDIDO *</div>
        <textarea style={{width:"100%",padding:"12px 14px",border:"1px solid #e2e8f0",borderRadius:12,
          fontSize:13,outline:"none",resize:"none",minHeight:100,fontFamily:"inherit",boxSizing:"border-box"}}
          value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}
          placeholder="Descreva aqui seu pedido de oração..."/>
      </div>
      <div style={{background:"#f8fafc",borderRadius:14,padding:"14px",marginBottom:20,border:"1px solid #e2e8f0"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:10}}>GOSTARIA DE RECEBER?</div>
        {[
          {key:"visita",  label:"Uma visita de um membro da igreja", icon:"🏠"},
          {key:"ligacao", label:"Uma ligação de um membro da igreja", icon:"📞"},
        ].map(opt=>(
          <label key={opt.key} style={{display:"flex",alignItems:"center",gap:10,
            marginBottom:10,cursor:"pointer",padding:"8px 10px",borderRadius:10,
            background:form[opt.key]?"#ede9fe":"transparent",transition:"all .15s"}}>
            <input type="checkbox" checked={form[opt.key]}
              onChange={e=>setForm(f=>({...f,[opt.key]:e.target.checked}))}
              style={{width:18,height:18,accentColor:"#7c3aed"}}/>
            <span style={{fontSize:13,color:"#374151"}}>{opt.icon} {opt.label}</span>
          </label>
        ))}
      </div>
      <button onClick={salvar} style={{
        width:"100%",padding:"14px",border:"none",borderRadius:14,cursor:"pointer",
        background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff",
        fontSize:15,fontWeight:700,boxShadow:"0 4px 16px rgba(124,58,237,0.4)"
      }}>🙏 Enviar Pedido de Oração</button>
    </div>
  );

  // ── MURAL ──
  if(view==="mural") return (
    <div style={{padding:"0 16px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
        <button onClick={()=>setView("lista")} style={{background:"#f1f5f9",border:"none",borderRadius:20,
          padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#64748b",display:"flex",alignItems:"center",gap:4}}>
          ← Voltar
        </button>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Mural de Orações</div>
        <span style={{marginLeft:"auto",background:"#ede9fe",color:"#7c3aed",borderRadius:20,
          padding:"2px 10px",fontSize:11,fontWeight:700}}>{enviados.length} pedidos</span>
      </div>

      {/* Banner */}
      <div style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",borderRadius:18,
        padding:"16px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontSize:36}}>🕊️</div>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Mural de Pedidos</div>
          <div style={{color:"rgba(255,255,255,0.75)",fontSize:12,marginTop:2}}>
            "Orai uns pelos outros" — Tiago 5:16
          </div>
        </div>
      </div>

      {enviados.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>🕊️</div>
          <div style={{fontWeight:600,fontSize:14}}>Nenhum pedido ainda</div>
        </div>
      ) : enviados.map(p=>(
        <div key={p.id} style={{background:"#fff",borderRadius:16,padding:"14px",
          marginBottom:12,border:"1px solid #ede9fe",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)",position:"relative"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <span style={{background:"#ede9fe",color:"#7c3aed",borderRadius:20,
              padding:"3px 10px",fontSize:11,fontWeight:700}}>{p.motivo}</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>{p.em}</span>
          </div>
          <div style={{fontWeight:600,fontSize:13,color:"#1e293b",marginBottom:4}}>
            {p.anonimo?"Anônimo":p.nome}
          </div>
          <div style={{fontSize:12,color:"#64748b",lineHeight:1.5,marginBottom:8}}>{p.descricao}</div>
          {(p.visita||p.ligacao) && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {p.visita  && <span style={{background:"#f0fdf4",color:"#16a34a",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:600}}>🏠 Visita</span>}
              {p.ligacao && <span style={{background:"#eff6ff",color:"#2563eb",borderRadius:20,padding:"2px 9px",fontSize:10,fontWeight:600}}>📞 Ligação</span>}
            </div>
          )}
          {podeExcluir(p) && (
            confirmDel===p.id ? (
              <div style={{display:"flex",gap:8,marginTop:6}}>
                <button onClick={()=>excluir(p.id)} style={{background:"#dc2626",color:"#fff",border:"none",
                  borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  Confirmar exclusão
                </button>
                <button onClick={()=>setConfirmDel(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",
                  borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={()=>setConfirmDel(p.id)} style={{
                background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:8,
                padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer",marginTop:4}}>
                🗑 Excluir
              </button>
            )
          )}
        </div>
      ))}
    </div>
  );

  // ── LISTA PESSOAL ──
  const meusPedidos = enviados.filter(p=>p.autorId===user?.id || (!p.autorId && !p.anonimo && p.nome===user?.nome));
  return (
    <div style={{padding:"0 16px 24px"}}>
      {/* Header roxo */}
      <div style={{background:"linear-gradient(135deg,#7c3aed,#5b21b6)",borderRadius:18,
        padding:"20px",marginBottom:20,textAlign:"center",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
        <div style={{fontSize:36,marginBottom:6}}>🙏</div>
        <div style={{color:"#fff",fontWeight:700,fontSize:17}}>Pedidos de Oração</div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:4}}>
          "Orai uns pelos outros" — Tiago 5:16
        </div>
      </div>

      {/* Botões de ação */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
        <button onClick={()=>setView("form")} style={{
          padding:"12px",border:"none",borderRadius:14,cursor:"pointer",
          background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff",
          fontSize:13,fontWeight:700,boxShadow:"0 4px 16px rgba(124,58,237,0.3)"
        }}>+ Fazer pedido</button>
        <button onClick={()=>setView("mural")} style={{
          padding:"12px",border:"none",borderRadius:14,cursor:"pointer",
          background:"#f5f3ff",color:"#7c3aed",fontSize:13,fontWeight:700,
          border:"2px solid #ede9fe"
        }}>🕊️ Ver mural ({enviados.length})</button>
      </div>

      {/* Meus pedidos */}
      <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,marginBottom:12}}>MEUS PEDIDOS</div>
      {meusPedidos.length===0 ? (
        <div style={{textAlign:"center",padding:"32px 20px",color:"#94a3b8",
          background:"#faf5ff",borderRadius:16,border:"1px dashed #ddd6fe"}}>
          <div style={{fontSize:40,marginBottom:10}}>🕊️</div>
          <div style={{fontWeight:600,fontSize:13}}>Você ainda não fez pedidos</div>
          <div style={{fontSize:12,marginTop:4}}>Clique em "+ Fazer pedido" para compartilhar sua prece</div>
        </div>
      ) : meusPedidos.map(p=>(
        <div key={p.id} style={{background:"#fff",borderRadius:16,padding:"14px",
          marginBottom:12,border:"1px solid #ede9fe",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <span style={{background:"#ede9fe",color:"#7c3aed",borderRadius:20,
              padding:"3px 10px",fontSize:11,fontWeight:700}}>{p.motivo}</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>{p.em}</span>
          </div>
          <div style={{fontSize:12,color:"#64748b",lineHeight:1.5,marginBottom:8}}>{p.descricao}</div>
          {confirmDel===p.id ? (
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>excluir(p.id)} style={{background:"#dc2626",color:"#fff",border:"none",
                borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                Confirmar exclusão
              </button>
              <button onClick={()=>setConfirmDel(null)} style={{background:"#f1f5f9",color:"#64748b",border:"none",
                borderRadius:8,padding:"5px 12px",fontSize:12,cursor:"pointer"}}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={()=>setConfirmDel(p.id)} style={{
              background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:8,
              padding:"4px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
              🗑 Excluir
            </button>
          )}
        </div>
      ))}
    </div>
  );
}


const BottomNav = ({isAdmin, nav, setNav, anivHoje, saving, handleLogout, navLabel, setSecPage}) => {

  const SVG = {
    home:    (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>),
    membros: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>),
    agenda:  (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1.2"/><circle cx="12" cy="15" r="1.2"/></svg>),
    oracao:  (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>),
    escalas: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="13" y2="18"/></svg>),
    aniv: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><path d="M8 7a4 4 0 0 1 8 0"/><line x1="12" y1="3" x2="12" y2="7"/><path d="M9 11h6"/></svg>),
  };

  const TABS = [
    {id:"home",       l:"Início",  k:"home"},
    {id:"membros",    l:"Membros", k:"membros"},
    {id:"agenda",     l:"Agenda",  k:"agenda"},
    {id:"oracao",     l:"Oração",  k:"oracao"},
    ...(isAdmin
      ? [{id:"secretaria", l:"Escalas", k:"escalas", secPage:"escalas_ev"}]
      : [{id:"relatorio",  l:"Aniversários", k:"aniv"}]
    ),
  ];

  return (
    <>
      {/* Topo */}
      <div style={{position:"fixed",top:0,left:0,right:0,height:52,zIndex:50,
        background:"linear-gradient(135deg,#3d0c0a,#742a28,#8b3230)",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"0 14px",boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <img src={LOGO_B64} style={{width:32,height:32,objectFit:"contain"}} alt="Logo"/>
          <div style={{color:"#f5e6c8",fontWeight:700,fontSize:14}}>{navLabel}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {anivHoje>0 && <div style={{background:"rgba(251,191,36,0.2)",border:"1px solid rgba(251,191,36,0.4)",borderRadius:20,padding:"2px 9px",fontSize:11,color:"#fbbf24",fontWeight:600}}>🎂{anivHoje}</div>}
          {saving && <span style={{color:"rgba(255,255,255,0.4)",fontSize:10}}>💾</span>}
          <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:7,color:"rgba(255,255,255,0.7)",padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:600}}>Sair</button>
        </div>
      </div>

      {/* Barra inferior */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:50,
        background:"#1a0504",borderTop:"1px solid rgba(255,255,255,0.08)",
        display:"flex",paddingBottom:"env(safe-area-inset-bottom,0px)",
        boxShadow:"0 -4px 20px rgba(0,0,0,0.4)"}}>
        {TABS.map(t=>{
          const active = nav===t.id;
          return (
            <button key={t.id}
              onClick={()=>{
                setNav(t.id);
                if(t.secPage) setSecPage(t.secPage);
              }}
              style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",gap:4,padding:"10px 2px 8px",
                border:"none",background:"transparent",cursor:"pointer",
                outline:"none",WebkitTapHighlightColor:"transparent",position:"relative"}}>
              {active && <div style={{position:"absolute",top:6,width:44,height:30,
                borderRadius:15,background:"rgba(201,168,76,0.2)"}}/>}
              <span style={{color:active?"#c9a84c":"rgba(255,255,255,0.38)",
                position:"relative",zIndex:1,transition:"color 0.15s"}}>
                {SVG[t.k]}
              </span>
              <span style={{fontSize:10,fontWeight:active?700:400,
                color:active?"#c9a84c":"rgba(255,255,255,0.38)",
                position:"relative",zIndex:1,transition:"color 0.15s"}}>
                {t.l}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

