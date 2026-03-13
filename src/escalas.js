// ═══ escalas.js — EscalasView, EventosTab, EscalarTab, MinhasEscalasTab ═══

function EscalasView({members, currentUser, showToast, isAdmin}) {
  const [sub, setSub] = useState("eventos");

  // ── Dados ────────────────────────────────────────────────────────────────
  const [eventos, setEventos] = useState(() => {
    try { const r = localStorage.getItem("esc_eventos"); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  });
  const [escalas, setEscalas] = useState(() => {
    try { const r = localStorage.getItem("esc_escalas"); return r ? JSON.parse(r) : []; } catch(e) { return []; }
  });
  const [syncOk, setSyncOk] = useState(false);

  // Escutar Firebase em tempo real (igual ao resto do app)
  React.useEffect(() => {
    fbListen("church/esc_eventos", (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        setEventos(data);
        try { localStorage.setItem("esc_eventos", JSON.stringify(data)); } catch(e) {}
      }
      setSyncOk(true);
    });
    fbListen("church/esc_escalas", (data) => {
      if (data && Array.isArray(data)) {
        setEscalas(data);
        try { localStorage.setItem("esc_escalas", JSON.stringify(data)); } catch(e) {}
      }
    });
  }, []);

  async function saveEventos(list) {
    setEventos(list);
    const json = JSON.stringify(list);
    try { localStorage.setItem("esc_eventos", json); } catch(e) {}
    try { await fbSet("church/esc_eventos", list); } catch(e) {
      // Se Firebase falhou, ainda está no localStorage
      showToast("Salvo localmente (sem internet)", "warn");
    }
  }

  async function saveEscalas(list) {
    setEscalas(list);
    const json = JSON.stringify(list);
    try { localStorage.setItem("esc_escalas", json); } catch(e) {}
    try { await fbSet("church/esc_escalas", list); } catch(e) {
      showToast("Salvo localmente (sem internet)", "warn");
    }
  }

  // ── Estilos ───────────────────────────────────────────────────────────────
  const INP_S = {width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
    fontSize:13,outline:"none",background:"#f8fafc",boxSizing:"border-box"};
  const BTN = (bg="#8b3230",c="#fff") => ({background:bg,color:c,border:"none",borderRadius:9,
    padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer"});

  const SUBS = isAdmin
    ? [{id:"eventos",l:"📅 Eventos"},{id:"escalar",l:"👥 Escalar"},{id:"minhas",l:"👤 Minhas"}]
    : [{id:"eventos",l:"📅 Eventos"},{id:"minhas",l:"👤 Minhas"}];

  return (
    <div>
      {/* Sub-navegação */}
      <div style={{display:"flex",gap:6,marginBottom:18,background:"#f1f5f9",borderRadius:12,padding:4}}>
        {SUBS.map(s => (
          <button key={s.id} onClick={()=>setSub(s.id)} style={{
            flex:1,padding:"9px 4px",border:"none",borderRadius:9,cursor:"pointer",
            fontWeight:700,fontSize:13,transition:"all .15s",
            background:sub===s.id?"#fff":"transparent",
            color:sub===s.id?"#8b3230":"#64748b",
            boxShadow:sub===s.id?"0 1px 6px rgba(0,0,0,0.1)":"none"
          }}>{s.l}</button>
        ))}
      </div>

      {/* ── EVENTOS ──────────────────────────────────────────────────────── */}
      {sub==="eventos" && (
        <EventosTab
          eventos={eventos}
          saveEventos={saveEventos}
          isAdmin={isAdmin}
          showToast={showToast}
        />
      )}

      {/* ── ESCALAR (só admin) ───────────────────────────────────────────── */}
      {sub==="escalar" && isAdmin && (
        <EscalarTab
          eventos={eventos}
          escalas={escalas}
          saveEscalas={saveEscalas}
          members={members}
          showToast={showToast}
        />
      )}

      {/* ── MINHAS ESCALAS ───────────────────────────────────────────────── */}
      {sub==="minhas" && (
        <MinhasEscalasTab
          eventos={eventos}
          escalas={escalas}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// ── Aba: Eventos ─────────────────────────────────────────────────────────────
function EventosTab({eventos, saveEventos, isAdmin, showToast}) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({nome:"",data:"",hora:"",local:"",recorrencia:"unico"});
  const [confirmDel, setConfirmDel] = useState(null);

  function hf(k,v){ setForm(f=>({...f,[k]:v})); }

  function openNew(){
    setForm({nome:"",data:"",hora:"",local:"",recorrencia:"unico"});
    setEditId(null); setShowForm(true);
  }

  function openEdit(ev){
    setForm({nome:ev.nome,data:ev.data,hora:ev.hora||"",local:ev.local||"",recorrencia:ev.recorrencia||"unico"});
    setEditId(ev.id); setShowForm(true);
  }

  async function salvar(){
    if(!form.nome.trim()){ showToast("Informe o nome do evento","error"); return; }
    if(!form.data){ showToast("Informe a data","error"); return; }
    let lista;
    if(editId){
      lista = eventos.map(e => e.id===editId ? {...e,...form} : e);
    } else {
      lista = [...eventos, {id:Date.now(),...form,ativo:true}];
    }
    await saveEventos(lista);
    showToast(editId?"Evento atualizado!":"Evento criado! ✅");
    setShowForm(false);
  }

  async function excluir(id){
    await saveEventos(eventos.filter(e=>e.id!==id));
    showToast("Evento removido.","error");
    setConfirmDel(null);
  }

  async function toggleAtivo(ev){
    await saveEventos(eventos.map(e=>e.id===ev.id?{...e,ativo:!e.ativo}:e));
  }

  const INP_S = {width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
    fontSize:13,outline:"none",background:"#f8fafc",boxSizing:"border-box"};

  const proximos = eventos
    .filter(e=>e.data && new Date(e.data+"T23:59")>=new Date())
    .sort((a,b)=>a.data.localeCompare(b.data));
  const passados = eventos
    .filter(e=>e.data && new Date(e.data+"T23:59")<new Date())
    .sort((a,b)=>b.data.localeCompare(a.data));

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Eventos</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{eventos.length} cadastrado{eventos.length!==1?"s":""}</div>
        </div>
        {isAdmin && (
          <button onClick={openNew} style={{
            background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",
            border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",
            display:"flex",alignItems:"center",gap:6
          }}>+ Novo Evento</button>
        )}
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:16,
          boxShadow:"0 4px 20px rgba(0,0,0,0.1)",border:"1px solid rgba(139,50,48,0.12)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:14}}>
            {editId?"✏️ Editar Evento":"➕ Novo Evento"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Nome do Evento *</div>
              <input style={INP_S} value={form.nome} onChange={e=>hf("nome",e.target.value)} placeholder="Ex: Culto Dominical, Reunião de Jovens..."/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Data *</div>
              <input type="date" style={INP_S} value={form.data} onChange={e=>hf("data",e.target.value)}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Horário</div>
              <input type="time" style={INP_S} value={form.hora} onChange={e=>hf("hora",e.target.value)}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Local</div>
              <input style={INP_S} value={form.local} onChange={e=>hf("local",e.target.value)} placeholder="Ex: Templo Central"/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Recorrência</div>
              <select style={INP_S} value={form.recorrencia} onChange={e=>hf("recorrencia",e.target.value)}>
                <option value="unico">Único</option>
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowForm(false)} style={{
              background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,
              padding:"9px 18px",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={salvar} style={{
              background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",
              border:"none",borderRadius:9,padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              💾 Salvar
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:320,width:"100%",
            boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Excluir evento?</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>
              Isso também removerá todas as escalas vinculadas a este evento.
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"10px",border:"1px solid #e2e8f0",
                borderRadius:9,background:"#f8fafc",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                Cancelar
              </button>
              <button onClick={()=>excluir(confirmDel)} style={{flex:1,padding:"10px",border:"none",
                borderRadius:9,background:"#dc2626",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de eventos */}
      {eventos.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>📅</div>
          <div style={{fontWeight:700,fontSize:15}}>Nenhum evento cadastrado</div>
          {isAdmin && <div style={{fontSize:13,marginTop:6}}>Clique em "+ Novo Evento" para começar</div>}
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {proximos.length > 0 && (
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",letterSpacing:1,
                textTransform:"uppercase",marginBottom:8,padding:"0 2px"}}>
                🔜 Próximos ({proximos.length})
              </div>
              {proximos.map(ev => <EventoCard key={ev.id} ev={ev} isAdmin={isAdmin}
                onEdit={openEdit} onDelete={id=>setConfirmDel(id)} onToggle={toggleAtivo}/>)}
            </div>
          )}
          {passados.length > 0 && (
            <div style={{marginTop:proximos.length>0?8:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,
                textTransform:"uppercase",marginBottom:8,padding:"0 2px"}}>
                ⏪ Passados ({passados.length})
              </div>
              {passados.map(ev => <EventoCard key={ev.id} ev={ev} isAdmin={isAdmin}
                onEdit={openEdit} onDelete={id=>setConfirmDel(id)} onToggle={toggleAtivo}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventoCard({ev, isAdmin, onEdit, onDelete, onToggle}) {
  const dataFmt = ev.data ? new Date(ev.data+"T12:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}) : "";
  const isPassado = ev.data && new Date(ev.data+"T23:59") < new Date();
  const recLabel = {unico:"",semanal:"🔁 Semanal",quinzenal:"🔁 Quinzenal",mensal:"🔁 Mensal"};
  return (
    <div style={{background:"#fff",borderRadius:12,padding:"14px 16px",
      boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",
      opacity:isPassado?0.7:1,
      borderLeft:`4px solid ${isPassado?"#e2e8f0":"#8b3230"}`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:4}}>{ev.nome}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:12,color:"#64748b"}}>📅 {dataFmt}</span>
            {ev.hora && <span style={{fontSize:12,color:"#64748b"}}>🕐 {ev.hora}</span>}
            {ev.local && <span style={{fontSize:12,color:"#64748b"}}>📍 {ev.local}</span>}
            {ev.recorrencia && ev.recorrencia!=="unico" && (
              <span style={{fontSize:11,background:"#eff6ff",color:"#2563eb",borderRadius:10,padding:"1px 7px",fontWeight:600}}>
                {recLabel[ev.recorrencia]}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>onEdit(ev)} style={{
              background:"#dbeafe",color:"#1d4ed8",border:"none",borderRadius:7,
              padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>✏️</button>
            <button onClick={()=>onDelete(ev.id)} style={{
              background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,
              padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>🗑</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba: Escalar membros (admin) ──────────────────────────────────────────────
function EscalarTab({eventos, escalas, saveEscalas, members, showToast}) {
  const [showForm, setShowForm] = useState(false);
  const [evSel, setEvSel] = useState("");
  const [form, setForm] = useState({eventoId:"",membroNome:"",funcao:"",data:"",obs:""});
  const [editId, setEditId] = useState(null);
  const [filtroEv, setFiltroEv] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  const INP_S = {width:"100%",padding:"10px 12px",borderRadius:9,border:"1.5px solid #e2e8f0",
    fontSize:13,outline:"none",background:"#f8fafc",boxSizing:"border-box"};

  const evAtivos = eventos.filter(e=>e.ativo!==false);

  function openNew(){
    setForm({eventoId:evSel||"",membroNome:"",funcao:"",data:"",obs:""});
    setEditId(null); setShowForm(true);
  }

  function openEdit(esc){
    setForm({eventoId:String(esc.eventoId),membroNome:esc.membroNome,funcao:esc.funcao||"",data:esc.data||"",obs:esc.obs||""});
    setEditId(esc.id); setShowForm(true);
  }

  async function salvar(){
    if(!form.eventoId){ showToast("Selecione o evento","error"); return; }
    if(!form.membroNome){ showToast("Selecione o membro","error"); return; }
    let lista;
    if(editId){
      lista = escalas.map(e=>e.id===editId?{...e,...form,eventoId:Number(form.eventoId)}:e);
    } else {
      lista = [...escalas,{id:Date.now(),...form,eventoId:Number(form.eventoId)}];
    }
    await saveEscalas(lista);
    showToast(editId?"Escala atualizada!":"Membro escalado! ✅");
    setShowForm(false);
  }

  function excluir(id){
    saveEscalas(escalas.filter(e=>e.id!==id));
    showToast("Escala removida.","error");
    setConfirmDel(null);
  }

  const escalasVisiveis = filtroEv
    ? escalas.filter(e=>String(e.eventoId)===filtroEv)
    : escalas;

  const escalasOrdenadas = [...escalasVisiveis].sort((a,b)=>{
    const da = a.data||"0", db = b.data||"0";
    return db.localeCompare(da);
  });

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Escalas</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{escalas.length} escala{escalas.length!==1?"s":""} cadastrada{escalas.length!==1?"s":""}</div>
        </div>
        <button onClick={openNew} style={{
          background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",
          border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",
          display:"flex",alignItems:"center",gap:6}}>+ Escalar</button>
      </div>

      {/* Filtro por evento */}
      <div style={{marginBottom:14}}>
        <select style={{...INP_S,background:"#fff"}} value={filtroEv} onChange={e=>setFiltroEv(e.target.value)}>
          <option value="">Todos os eventos ({escalas.length})</option>
          {evAtivos.map(ev=>(
            <option key={ev.id} value={String(ev.id)}>
              {ev.nome}{ev.data?" — "+new Date(ev.data+"T12:00").toLocaleDateString("pt-BR"):""}
              {" ("+escalas.filter(e=>e.eventoId===ev.id).length+")"}
            </option>
          ))}
        </select>
      </div>

      {/* Formulário inline */}
      {showForm && (
        <div style={{background:"#fff",borderRadius:14,padding:18,marginBottom:16,
          boxShadow:"0 4px 20px rgba(0,0,0,0.1)",border:"1px solid rgba(139,50,48,0.12)"}}>
          <div style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:14}}>
            {editId?"✏️ Editar Escala":"➕ Escalar Membro"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Evento *</div>
              <select style={INP_S} value={form.eventoId} onChange={e=>setForm(f=>({...f,eventoId:e.target.value}))}>
                <option value="">Selecione o evento...</option>
                {evAtivos.map(ev=><option key={ev.id} value={String(ev.id)}>{ev.nome}{ev.data?" — "+new Date(ev.data+"T12:00").toLocaleDateString("pt-BR"):""}</option>)}
              </select>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Membro *</div>
              <select style={INP_S} value={form.membroNome} onChange={e=>setForm(f=>({...f,membroNome:e.target.value}))}>
                <option value="">Selecione o membro...</option>
                {[...members].filter(m=>m.ativo).sort((a,b)=>a.nome.localeCompare(b.nome)).map(m=>(
                  <option key={m.id} value={m.nome}>{m.nome}{m.cargo&&m.cargo!=="Membro"?" — "+m.cargo:""}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Função / Ministério</div>
              <input style={INP_S} value={form.funcao} onChange={e=>setForm(f=>({...f,funcao:e.target.value}))} placeholder="Ex: Som, Obreiro, Louvor..."/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Data</div>
              <input type="date" style={INP_S} value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#64748b",marginBottom:4,textTransform:"uppercase"}}>Observação</div>
              <input style={INP_S} value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} placeholder="Opcional..."/>
            </div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setShowForm(false)} style={{
              background:"#f1f5f9",color:"#64748b",border:"none",borderRadius:9,
              padding:"9px 18px",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
            <button onClick={salvar} style={{
              background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",
              border:"none",borderRadius:9,padding:"9px 20px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              💾 Salvar
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmação exclusão */}
      {confirmDel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:24,maxWidth:300,width:"100%"}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Remover escala?</div>
            <div style={{fontSize:13,color:"#64748b",marginBottom:20}}>Esta ação não pode ser desfeita.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,padding:"10px",border:"1px solid #e2e8f0",
                borderRadius:9,background:"#f8fafc",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>excluir(confirmDel)} style={{flex:1,padding:"10px",border:"none",
                borderRadius:9,background:"#dc2626",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de escalas */}
      {escalasOrdenadas.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 20px",color:"#94a3b8"}}>
          <div style={{fontSize:48,marginBottom:12}}>👥</div>
          <div style={{fontWeight:700,fontSize:15}}>Nenhuma escala encontrada</div>
          <div style={{fontSize:13,marginTop:6}}>Clique em "+ Escalar" para adicionar</div>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {escalasOrdenadas.map(esc=>{
            const ev = eventos.find(e=>e.id===esc.eventoId);
            const dataFmt = esc.data ? new Date(esc.data+"T12:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"}) : "";
            return (
              <div key={esc.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",
                display:"flex",alignItems:"center",gap:12}}>
                {/* Avatar */}
                <div style={{width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#742a28,#8b3230)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#fff",fontWeight:700,fontSize:16,flexShrink:0}}>
                  {esc.membroNome[0]?.toUpperCase()}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{esc.membroNome}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3,alignItems:"center"}}>
                    {ev && <span style={{fontSize:11,background:"#f1f5f9",color:"#475569",borderRadius:8,padding:"1px 7px",fontWeight:600}}>{ev.nome}</span>}
                    {esc.funcao && <span style={{fontSize:11,background:"#eff6ff",color:"#2563eb",borderRadius:8,padding:"1px 7px",fontWeight:600}}>{esc.funcao}</span>}
                    {dataFmt && <span style={{fontSize:11,color:"#94a3b8"}}>📅 {dataFmt}</span>}
                  </div>
                  {esc.obs && <div style={{fontSize:11,color:"#94a3b8",marginTop:3}}>{esc.obs}</div>}
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  <button onClick={()=>openEdit(esc)} style={{
                    background:"#dbeafe",color:"#1d4ed8",border:"none",borderRadius:7,
                    padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>✏️</button>
                  <button onClick={()=>setConfirmDel(esc.id)} style={{
                    background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:7,
                    padding:"6px 10px",fontSize:12,cursor:"pointer",fontWeight:700}}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Aba: Minhas Escalas ───────────────────────────────────────────────────────
function MinhasEscalasTab({eventos, escalas, currentUser}) {
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  // Filtrar por nome do usuário logado
  const nomeUser = currentUser?.nome?.toLowerCase()?.trim() || "";
  const minhas = escalas.filter(e => {
    const n = (e.membroNome||"").toLowerCase().trim();
    return n === nomeUser || n.split(" ")[0] === nomeUser.split(" ")[0];
  });

  const proximas = minhas
    .filter(e=>e.data && new Date(e.data+"T23:59")>=hoje)
    .sort((a,b)=>a.data.localeCompare(b.data));

  const passadas = minhas
    .filter(e=>!e.data || new Date(e.data+"T23:59")<hoje)
    .sort((a,b)=>(b.data||"0").localeCompare(a.data||"0"))
    .slice(0,5);

  if(minhas.length===0) return (
    <div style={{textAlign:"center",padding:"56px 20px",color:"#94a3b8"}}>
      <div style={{fontSize:52,marginBottom:14}}>🙌</div>
      <div style={{fontWeight:700,fontSize:15,color:"#374151"}}>Você não está escalado</div>
      <div style={{fontSize:13,marginTop:8,color:"#94a3b8"}}>Quando um admin te escalar,<br/>aparecerá aqui.</div>
    </div>
  );

  function EscalaItem({esc, destaque}) {
    const ev = eventos.find(e=>e.id===esc.eventoId);
    const dataFmt = esc.data ? new Date(esc.data+"T12:00").toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long"}) : "Data não definida";
    const isHoje = esc.data && (() => { const d=new Date(esc.data+"T12:00"); d.setHours(0,0,0,0); return d.getTime()===hoje.getTime(); })();
    return (
      <div style={{background:destaque?"#fff7ed":"#fff",borderRadius:12,padding:"14px 16px",
        boxShadow:"0 1px 6px rgba(0,0,0,0.07)",
        border:destaque?`1.5px solid ${isHoje?"#f59e0b":"#8b3230"}22`:"1px solid #f1f5f9",
        borderLeft:`4px solid ${isHoje?"#f59e0b":destaque?"#8b3230":"#e2e8f0"}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#1e293b",marginBottom:4}}>
              {ev?.nome || "Evento não encontrado"}
              {isHoje && <span style={{marginLeft:8,fontSize:11,background:"#fef3c7",color:"#92400e",borderRadius:10,padding:"2px 8px",fontWeight:700}}>HOJE!</span>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:12,color:"#64748b"}}>📅 {dataFmt}</span>
              {ev?.hora && <span style={{fontSize:12,color:"#64748b"}}>🕐 {ev.hora}</span>}
              {esc.funcao && (
                <span style={{fontSize:11,background:"#eff6ff",color:"#2563eb",borderRadius:10,padding:"2px 8px",fontWeight:600}}>
                  {esc.funcao}
                </span>
              )}
            </div>
            {ev?.local && <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>📍 {ev.local}</div>}
            {esc.obs && <div style={{fontSize:12,color:"#94a3b8",marginTop:4,fontStyle:"italic"}}>{esc.obs}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:16,color:"#1e293b"}}>Minhas Escalas</div>
        <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>
          {proximas.length} próxima{proximas.length!==1?"s":""} · {minhas.length} no total
        </div>
      </div>

      {proximas.length > 0 && (
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:"#8b3230",letterSpacing:1,
            textTransform:"uppercase",marginBottom:10}}>🔜 Próximas</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {proximas.map(e=><EscalaItem key={e.id} esc={e} destaque={true}/>)}
          </div>
        </div>
      )}

      {passadas.length > 0 && (
        <div>
          <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",letterSpacing:1,
            textTransform:"uppercase",marginBottom:10}}>⏪ Recentes</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {passadas.map(e=><EscalaItem key={e.id} esc={e} destaque={false}/>)}
          </div>
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// SECRETARIA VIEW
// ════════════════════════════════════════════════════════════════════════════
