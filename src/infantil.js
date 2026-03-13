// ═══ infantil.js — InfantilView, check-in, CRUD crianças ═══

function InfantilView({members, showToast, congregacoes=[]}) {
  const [criancas, setCriancas]   = useState([]);
  const [view, setView]           = useState("lista");
  const [form, setForm]           = useState(EMPTY_CRIANCA);
  const [editing, setEditing]     = useState(null);
  const [detalhe, setDetalhe]     = useState(null);
  const [search, setSearch]       = useState("");
  const [filtro, setFiltro]       = useState("todos");
  const [modalWA, setModalWA]     = useState(null); // {crianca, resp, tel}
  const [selTemplate, setSelTemplate] = useState(null);
  const hf = (k,v) => setForm(f=>({...f,[k]:v}));

  useEffect(()=>{
    (async()=>{
      try{const r=localStorage.getItem("church_criancas");if(r){setCriancas(JSON.parse(r));return;}}catch(e){}
      try{const r=await window.storage.get("church_criancas");if(r?.value){const d=JSON.parse(r.value);setCriancas(d);localStorage.setItem("church_criancas",r.value);}}catch(e){}
    })();
  },[]);

  const saveCriancas = async list => {
    const json=JSON.stringify(list);
    try{localStorage.setItem("church_criancas",json);}catch(e){}
    try{await fbSet("church/criancas", list);}catch(e){}
    try{await window.storage.set("church_criancas",json);}catch(e){}
  };

  function onSelectMembro(membroId) {
    hf("membroId", membroId ? Number(membroId) : null);
    if (membroId) {
      const m = members.find(mb=>mb.id===Number(membroId));
      if (m) {
        setForm(f=>({...f, membroId:Number(membroId), responsavel1:m.nome, tel1:m.telefone||"", responsavel2:m.conjugeNome||f.responsavel2}));
      }
    }
  }

  async function salvar() {
    if (!form.nome.trim()) { showToast("Nome da crianca e obrigatorio","error"); return; }
    if (!form.responsavel1.trim()) { showToast("Informe o responsavel","error"); return; }
    const nova = {...form, id: editing || Date.now()};
    const updated = editing ? criancas.map(c=>c.id===editing?nova:c) : [...criancas, nova];
    setCriancas(updated); await saveCriancas(updated);
    showToast(editing?"Atualizado!":"Crianca cadastrada!");
    setView("lista"); setEditing(null); setForm(EMPTY_CRIANCA);
  }

  async function excluir(id) {
    if (!window.confirm("Excluir esta crianca?")) return;
    const updated = criancas.filter(c=>c.id!==id);
    setCriancas(updated); await saveCriancas(updated);
    showToast("Removido","error"); setDetalhe(null); setView("lista");
  }

  async function toggleCheckin(crianca) {
    const agora = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    const updated = criancas.map(c=>c.id===crianca.id
      ? {...c, checkin:!c.checkin, checkinHora: !c.checkin ? agora : ""}
      : c);
    setCriancas(updated); await saveCriancas(updated);
    showToast(!crianca.checkin ? `Check-in de ${crianca.nome}!` : `Check-out de ${crianca.nome}!`);
    if (detalhe?.id===crianca.id) setDetalhe(updated.find(c=>c.id===crianca.id));
  }

  function calcIdade(nasc) {
    if (!nasc) return "";
    const h=new Date(); const n=new Date(nasc+"T00:00");
    let anos=h.getFullYear()-n.getFullYear();
    if (h.getMonth()<n.getMonth()||(h.getMonth()===n.getMonth()&&h.getDate()<n.getDate())) anos--;
    if (anos<1) { const m=(h.getFullYear()-n.getFullYear())*12+h.getMonth()-n.getMonth(); return m+" mes"+(m!==1?"es":""); }
    return anos+" ano"+(anos!==1?"s":"");
  }

  function enviarWA(crianca, resp, tel, tpl) {
    if (!tel) { showToast("Sem telefone cadastrado","error"); return; }
    const msg = tpl.msg(crianca).replace(/\{resp\}/g, resp.split(" ")[0]);
    window.open("https://wa.me/55"+rawTel(tel)+"?text="+encodeURIComponent(msg),"_blank");
    setModalWA(null); setSelTemplate(null);
  }

  const membrosAtivos = members.filter(m=>m.ativo);
  const filtered = criancas.filter(c => {
    const q = search.toLowerCase();
    const okQ = !search || c.nome.toLowerCase().includes(q) || c.responsavel1.toLowerCase().includes(q);
    const okF = filtro==="todos"
      || (filtro==="presentes" && c.checkin)
      || (filtro==="membro" && c.tipo==="membro")
      || (filtro==="visitante" && c.tipo==="visitante");
    return okQ && okF;
  });

  const presentes   = criancas.filter(c=>c.checkin).length;
  const totMembro   = criancas.filter(c=>c.tipo==="membro").length;
  const totVisit    = criancas.filter(c=>c.tipo==="visitante").length;

  // ── MODAL WHATSAPP ─────────────────────────────────────────────────────────
  function ModalWA({data}) {
    const {crianca, resp1, tel1, resp2, tel2} = data;
    const [resp, setResp]   = useState(resp1);
    const [tel, setTel]     = useState(tel1);
    const [tpl, setTpl]     = useState(null);

    return (
      <Modal onClose={()=>setModalWA(null)} width={420}>
        <div style={{fontWeight:800,fontSize:17,marginBottom:4}}>Enviar WhatsApp</div>
        <div style={{color:"#64748b",fontSize:13,marginBottom:18}}>Sobre: <b>{crianca.nome}</b></div>

        {/* Escolher responsável */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Destinatario</div>
          <div style={{display:"flex",gap:8}}>
            {[{n:resp1,t:tel1},{n:resp2,t:tel2}].filter(r=>r.n).map((r,i)=>(
              <div key={i} onClick={()=>{setResp(r.n);setTel(r.t);}} style={{flex:1,padding:"10px 12px",borderRadius:10,border:"2px solid",borderColor:resp===r.n?"#25d366":"#e2e8f0",background:resp===r.n?"#f0fdf4":"#f8fafc",cursor:"pointer",transition:"all .15s"}}>
                <div style={{fontWeight:700,fontSize:13}}>{r.n.split(" ").slice(0,2).join(" ")}</div>
                <div style={{fontSize:11,color:"#64748b"}}>{r.t||"Sem tel"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div style={{marginBottom:18}}>
          <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Tipo de mensagem</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {WA_TEMPLATES.map(t=>(
              <div key={t.id} onClick={()=>setTpl(t)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"2px solid",borderColor:tpl?.id===t.id?t.borda:"#e2e8f0",background:tpl?.id===t.id?t.cor:"#f8fafc",cursor:"pointer",transition:"all .15s"}}>
                <span style={{fontSize:18}}>{t.emoji}</span>
                <span style={{fontWeight:600,fontSize:13,color:tpl?.id===t.id?t.texto:"#374151"}}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        {tpl && (
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:12,marginBottom:16,fontSize:12,color:"#166534",whiteSpace:"pre-line"}}>
            {tpl.msg(crianca).replace(/\{resp\}/g,resp.split(" ")[0])}
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn color="gray" onClick={()=>setModalWA(null)}>Cancelar</Btn>
          <Btn color="green" onClick={()=>tpl?enviarWA(crianca,resp,tel,tpl):showToast("Selecione uma mensagem","error")}>
            Enviar no WhatsApp
          </Btn>
        </div>
      </Modal>
    );
  }

  // ── DETALHE ────────────────────────────────────────────────────────────────
  if (view==="detalhe" && detalhe) {
    const c = criancas.find(x=>x.id===detalhe.id)||detalhe;
    const membroVinc = c.membroId ? members.find(m=>m.id===c.membroId) : null;
    return (
      <div>
        {modalWA && <ModalWA data={modalWA}/>}
        <div style={{marginBottom:14,display:"flex",gap:8,alignItems:"center"}}>
          <Btn color="gray" size="sm" onClick={()=>setView("lista")}>← Voltar</Btn>
          <Btn color={c.checkin?"red":"blue"} size="sm" onClick={()=>toggleCheckin(c)}>{c.checkin?"Check-out":"Check-in"}</Btn>
          <Btn color="gray" size="sm" onClick={()=>{setForm({...c});setEditing(c.id);setView("form");}}>Editar</Btn>
          <Btn color="red" size="sm" onClick={()=>excluir(c.id)}>Excluir</Btn>
        </div>

        <Card>
          {/* Header perfil */}
          <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:22,flexWrap:"wrap"}}>
            <div style={{position:"relative"}}>
              <Avatar nome={c.nome} foto={c.foto} size={80}/>
              <div style={{position:"absolute",bottom:-4,right:-4,width:24,height:24,borderRadius:"50%",background:c.checkin?"#059669":"#94a3b8",border:"3px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",fontWeight:800}}>
                {c.checkin?"✓":"–"}
              </div>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <span style={{fontWeight:800,fontSize:20}}>{c.nome}</span>
                <span style={{background:c.tipo==="visitante"?"#fef3c7":"#eff6ff",color:c.tipo==="visitante"?"#92400e":"#2563eb",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700,border:`1px solid ${c.tipo==="visitante"?"#fde68a":"#bfdbfe"}`}}>
                  {c.tipo==="visitante"?"Visitante":"Filho de Membro"}
                </span>
                {c.checkin && <span style={{background:"#dcfce7",color:"#16a34a",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>Na salinha desde {c.checkinHora}</span>}
                {c.congregacao && <span style={{background:"#ede9fe",color:"#7c3aed",borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>🏛 {c.congregacao}</span>}
              </div>
              {c.nascimento && <div style={{fontSize:13,color:"#64748b"}}>{calcIdade(c.nascimento)} &nbsp;·&nbsp; Nasc: {ptDate(c.nascimento)}</div>}
              {c.sexo && <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{c.sexo}</div>}
            </div>
          </div>

          {/* Alertas */}
          {c.alergia && (
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fef2f2",borderRadius:10,borderLeft:"4px solid #dc2626",marginBottom:12}}>
              <span style={{fontSize:18}}>⚠️</span>
              <div><div style={{fontWeight:700,fontSize:12,color:"#dc2626"}}>ALERGIA / RESTRICAO</div><div style={{fontSize:13,color:"#7f1d1d"}}>{c.alergia}</div></div>
            </div>
          )}
          {c.observacoes && (
            <div style={{padding:"10px 14px",background:"#fefce8",borderRadius:10,borderLeft:"4px solid #fbbf24",marginBottom:16,fontSize:13,color:"#78350f"}}>
              <b>Obs:</b> {c.observacoes}
            </div>
          )}

          {/* Membro vinculado */}
          {membroVinc && (
            <div style={{marginBottom:16,padding:"10px 12px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe",display:"flex",alignItems:"center",gap:10}}>
              <Avatar nome={membroVinc.nome} foto={membroVinc.foto} size={38}/>
              <div><div style={{fontSize:11,fontWeight:600,color:"#1d4ed8"}}>Membro vinculado</div><div style={{fontSize:14,fontWeight:700}}>{membroVinc.nome}</div></div>
            </div>
          )}

          {/* Responsáveis */}
          <div style={{fontWeight:700,fontSize:12,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Responsaveis</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {[{nome:c.responsavel1,tel:c.tel1,label:"Responsavel 1"},{nome:c.responsavel2,tel:c.tel2,label:"Responsavel 2"}].map((r,i)=>r.nome?(
              <div key={i} style={{background:"#f8fafc",borderRadius:12,padding:12,border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <Avatar nome={r.nome} size={38}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.nome}</div>
                    <div style={{fontSize:11,color:"#64748b"}}>{r.tel||"Sem telefone"}</div>
                  </div>
                </div>
                {r.tel && (
                  <button
                    onClick={()=>setModalWA({crianca:c,resp1:c.responsavel1,tel1:c.tel1,resp2:c.responsavel2,tel2:c.tel2})}
                    style={{width:"100%",padding:"7px",background:"linear-gradient(135deg,#25d366,#128c7e)",border:"none",borderRadius:8,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Enviar mensagem
                  </button>
                )}
              </div>
            ):null)}
          </div>

          {/* Mensagens rápidas */}
          {(c.tel1||c.tel2) && (
            <div>
              <div style={{fontWeight:700,fontSize:12,color:"#94a3b8",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}}>Mensagens rapidas</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {WA_TEMPLATES.map(t=>(
                  <button key={t.id}
                    onClick={()=>setModalWA({crianca:c,resp1:c.responsavel1,tel1:c.tel1,resp2:c.responsavel2,tel2:c.tel2})}
                    style={{padding:"8px 13px",background:t.cor,border:`1px solid ${t.borda}`,borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,color:t.texto,display:"flex",alignItems:"center",gap:5}}>
                    <span>{t.emoji}</span>{t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────
  if (view==="form") {
    return (
      <div style={{maxWidth:640,margin:"0 auto"}}>
        <div style={{marginBottom:14}}><Btn color="gray" size="sm" onClick={()=>{setView("lista");setEditing(null);setForm(EMPTY_CRIANCA);}}>← Voltar</Btn></div>
        <Card>
          <div style={{fontWeight:800,fontSize:18,marginBottom:20}}>{editing?"Editar Crianca":"Cadastrar Crianca"}</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>

            {/* Foto */}
            <div style={{display:"flex",gap:14,alignItems:"center",padding:14,background:"#f8fafc",borderRadius:12,border:"1px solid #e2e8f0"}}>
              <Avatar nome={form.nome||"?"} foto={form.foto} size={70}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  <div>
                    <input type="file" accept="image/*" capture="environment" id="cfoto-camera"
                      style={{display:"none"}}
                      onChange={async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{const resized=await resizeFoto(ev.target.result);hf("foto",resized);};r.readAsDataURL(f);}}/>
                    <label htmlFor="cfoto-camera" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                      📷 Câmera
                    </label>
                  </div>
                  <div>
                    <input type="file" accept="image/*" id="cfoto"
                      style={{display:"none"}}
                      onChange={async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{const resized=await resizeFoto(ev.target.result);hf("foto",resized);};r.readAsDataURL(f);}}/>
                    <label htmlFor="cfoto" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#e2e8f0",color:"#475569",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                      🖼️ Galeria
                    </label>
                  </div>
                  {form.foto && <button onClick={()=>hf("foto",null)} style={{padding:"7px 10px",background:"#fee2e2",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,color:"#dc2626",fontSize:12}}>✕</button>}
                </div>
                <div style={{fontSize:11,color:"#94a3b8"}}>Foto comprimida automaticamente</div>
              </div>
            </div>

            <Field label="Nome da crianca *"><input style={INP} value={form.nome} onChange={e=>hf("nome",e.target.value)} placeholder="Nome completo"/></Field>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="Data de nascimento"><input type="date" style={INP} value={form.nascimento} onChange={e=>hf("nascimento",e.target.value)}/></Field>
              <Field label="Sexo"><select style={SEL} value={form.sexo} onChange={e=>hf("sexo",e.target.value)}><option value="">Selecione</option><option>Masculino</option><option>Feminino</option></select></Field>
            </div>

            {/* Tipo */}
            <Field label="Tipo de crianca">
              <div style={{display:"flex",gap:10}}>
                {[{v:"membro",l:"Filho de Membro",emoji:"👨‍👩‍👦"},{v:"visitante",l:"Visitante",emoji:"⭐"}].map(t=>(
                  <div key={t.v} onClick={()=>hf("tipo",t.v)} style={{flex:1,padding:"12px",borderRadius:12,border:"2px solid",borderColor:form.tipo===t.v?"#2563eb":"#e2e8f0",background:form.tipo===t.v?"#eff6ff":"#f8fafc",cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
                    <div style={{fontSize:20,marginBottom:4}}>{t.emoji}</div>
                    <div style={{fontWeight:700,fontSize:13,color:form.tipo===t.v?"#2563eb":"#374151"}}>{t.l}</div>
                  </div>
                ))}
              </div>
            </Field>

            {/* Vincular membro */}
            {form.tipo==="membro" && (
              <Field label="Pai / Mae (membro da igreja)">
                <select style={SEL} value={form.membroId||""} onChange={e=>onSelectMembro(e.target.value)}>
                  <option value="">Selecione o membro...</option>
                  {membrosAtivos.map(m=><option key={m.id} value={m.id}>{m.nome}{m.cargo?" — "+m.cargo:""}</option>)}
                </select>
              </Field>
            )}

            {/* Congregação */}
            <Field label="Congregação (se de outra congregação)">
              <select style={INP} value={form.congregacao||""} onChange={e=>hf("congregacao",e.target.value)}>
                <option value="">Sede (padrão)</option>
                {congregacoes.filter(c=>!c.nome.includes("SEDE")).map(c=>(
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </Field>

            {/* Responsáveis */}
            <div style={{background:"#f8fafc",borderRadius:12,padding:14,border:"1px solid #e2e8f0"}}>
              <div style={{fontWeight:700,fontSize:12,color:"#64748b",textTransform:"uppercase",marginBottom:12}}>Responsaveis e contatos WhatsApp</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <Field label="Responsavel 1 *"><input style={INP} value={form.responsavel1} onChange={e=>hf("responsavel1",e.target.value)} placeholder="Nome"/></Field>
                <Field label="WhatsApp"><input style={INP} value={form.tel1} onChange={e=>hf("tel1",fTel(e.target.value))} placeholder="(00) 00000-0000"/></Field>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Field label="Responsavel 2 (opcional)"><input style={INP} value={form.responsavel2} onChange={e=>hf("responsavel2",e.target.value)} placeholder="Nome"/></Field>
                <Field label="WhatsApp"><input style={INP} value={form.tel2} onChange={e=>hf("tel2",fTel(e.target.value))} placeholder="(00) 00000-0000"/></Field>
              </div>
            </div>

            <Field label="Alergia / Restricao alimentar">
              <input style={INP} value={form.alergia} onChange={e=>hf("alergia",e.target.value)} placeholder="Ex: amendoim, lactose, gluten..."/>
            </Field>
            <Field label="Observacoes">
              <textarea style={{...INP,minHeight:64,resize:"vertical"}} value={form.observacoes} onChange={e=>hf("observacoes",e.target.value)} placeholder="Informacoes importantes para os monitores..."/>
            </Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:20,paddingTop:14,borderTop:"1px solid #f1f5f9"}}>
            <Btn color="gray" onClick={()=>{setView("lista");setEditing(null);setForm(EMPTY_CRIANCA);}}>Cancelar</Btn>
            <Btn color="blue" onClick={salvar}>{editing?"Atualizar":"Cadastrar"}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ── LISTA PRINCIPAL ────────────────────────────────────────────────────────
  // Separar filhos de membros e visitantes
  const filhosMembros  = filtered.filter(c=>c.tipo==="membro");
  const visitantes     = filtered.filter(c=>c.tipo==="visitante");

  function CardCrianca({c}) {
    const membroVinc = c.membroId ? members.find(m=>m.id===c.membroId) : null;
    return (
      <div className="mrow" style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderBottom:"1px solid #f8fafc",cursor:"pointer",transition:"background .12s"}} onClick={()=>{setDetalhe(c);setView("detalhe");}}>
        <div style={{position:"relative",flexShrink:0}}>
          <Avatar nome={c.nome} foto={c.foto} size={46}/>
          {c.checkin && <div style={{position:"absolute",bottom:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"#059669",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:800}}>✓</div>}
          {c.alergia && !c.checkin && <div style={{position:"absolute",bottom:-3,right:-3,width:16,height:16,borderRadius:"50%",background:"#dc2626",border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:800}}>!</div>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}>
            <span style={{fontWeight:700,fontSize:14}}>{c.nome}</span>
            {c.checkin && <span style={{background:"#dcfce7",color:"#16a34a",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>Na salinha</span>}
            {c.alergia && <span style={{background:"#fef2f2",color:"#dc2626",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>Alergia</span>}
          </div>
          <div style={{fontSize:12,color:"#64748b"}}>
            {calcIdade(c.nascimento)}{calcIdade(c.nascimento)&&" · "}{c.responsavel1}
            {membroVinc && <span style={{color:"#2563eb"}}> · {membroVinc.nome.split(" ")[0]}</span>}
            {c.checkin && c.checkinHora && <span style={{color:"#94a3b8"}}> · desde {c.checkinHora}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6}} onClick={e=>e.stopPropagation()}>
          {(c.tel1||c.tel2) && (
            <button
              onClick={()=>setModalWA({crianca:c,resp1:c.responsavel1,tel1:c.tel1,resp2:c.responsavel2,tel2:c.tel2})}
              title="Enviar WhatsApp"
              style={{width:34,height:34,borderRadius:8,background:"linear-gradient(135deg,#25d366,#128c7e)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
          )}
          <button
            onClick={()=>toggleCheckin(c)}
            style={{padding:"5px 10px",background:c.checkin?"#fee2e2":"#dcfce7",border:"none",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,color:c.checkin?"#dc2626":"#16a34a",whiteSpace:"nowrap"}}>
            {c.checkin?"Check-out":"Check-in"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {modalWA && <ModalWA data={modalWA}/>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        {[
          {l:"Total cadastradas", v:criancas.length,       c:"#7c3aed", emoji:"👦"},
          {l:"Na salinha agora",  v:presentes,             c:"#059669", emoji:"✅"},
          {l:"Filhos de membros", v:totMembro,             c:"#2563eb", emoji:"👨‍👩‍👦"},
          {l:"Visitantes",        v:totVisit,              c:"#d97706", emoji:"⭐"},
        ].map(s=>(
          <Card key={s.l} border={`2px solid ${s.c}22`}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <div style={{fontSize:26,fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:24,opacity:0.5}}>{s.emoji}</div>
            </div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:500}}>{s.l}</div>
          </Card>
        ))}
      </div>

      {/* Barra de ação */}
      <Card pad={0}>
        <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid #f1f5f9"}}>
          <input style={{...INP,flex:1,minWidth:150}} placeholder="Buscar crianca ou responsavel..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <div style={{display:"flex",background:"#f1f5f9",borderRadius:8,overflow:"hidden"}}>
            {[{id:"todos",l:"Todos"},{id:"presentes",l:"Na salinha"},{id:"membro",l:"Membros"},{id:"visitante",l:"Visitantes"}].map(f=>(
              <button key={f.id} onClick={()=>setFiltro(f.id)} style={{padding:"7px 12px",border:"none",cursor:"pointer",fontWeight:600,fontSize:12,background:filtro===f.id?"#7c3aed":"transparent",color:filtro===f.id?"#fff":"#64748b",transition:"all .15s"}}>{f.l}</button>
            ))}
          </div>
          {congregacoes.length > 1 && (
            <select style={{...INP,width:"auto",fontSize:12}} value={fCongInf} onChange={e=>setFCongInf(e.target.value)}>
              <option value="">Todas as congregações</option>
              <option value="__sede__">🏛 Sede (sem congregação)</option>
              {congregacoes.filter(c=>!c.nome.includes("SEDE")).map(c=>(
                <option key={c.id} value={c.nome}>{c.nome}</option>
              ))}
            </select>
          )}
          <Btn color="purple" onClick={()=>{setForm(EMPTY_CRIANCA);setEditing(null);setView("form");}}>+ Crianca</Btn>
        </div>

        {filtered.length===0 ? (
          <div style={{textAlign:"center",padding:56,color:"#94a3b8"}}>
            <div style={{fontSize:48,marginBottom:12}}>👦</div>
            <div style={{fontWeight:700,fontSize:15}}>{criancas.length===0?"Nenhuma crianca cadastrada ainda":"Nenhum resultado encontrado"}</div>
            {criancas.length===0 && <div style={{marginTop:14}}><Btn color="purple" onClick={()=>{setForm(EMPTY_CRIANCA);setEditing(null);setView("form");}}>Cadastrar primeira crianca</Btn></div>}
          </div>
        ) : (
          <>
            {/* Seção: filhos de membros */}
            {filhosMembros.length>0 && (
              <div>
                <div style={{padding:"10px 16px",background:"#eff6ff",borderBottom:"1px solid #bfdbfe",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>👨‍👩‍👦</span>
                  <span style={{fontWeight:700,fontSize:13,color:"#1d4ed8"}}>Filhos de Membros</span>
                  <span style={{background:"#bfdbfe",color:"#1d4ed8",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>{filhosMembros.length}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"#3b82f6"}}>{filhosMembros.filter(c=>c.checkin).length} na salinha</span>
                </div>
                {filhosMembros.map(c=><CardCrianca key={c.id} c={c}/>)}
              </div>
            )}

            {/* Seção: visitantes */}
            {visitantes.length>0 && (
              <div>
                <div style={{padding:"10px 16px",background:"#fffbeb",borderBottom:"1px solid #fde68a",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:16}}>⭐</span>
                  <span style={{fontWeight:700,fontSize:13,color:"#92400e"}}>Visitantes</span>
                  <span style={{background:"#fde68a",color:"#92400e",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>{visitantes.length}</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:"#d97706"}}>{visitantes.filter(c=>c.checkin).length} na salinha</span>
                </div>
                {visitantes.map(c=><CardCrianca key={c.id} c={c}/>)}
              </div>
            )}

            <div style={{padding:"8px 16px",fontSize:11,color:"#94a3b8",borderTop:"1px solid #f8fafc"}}>
              {filtered.length} crianca{filtered.length!==1?"s":""} · {filtered.filter(c=>c.checkin).length} presente{filtered.filter(c=>c.checkin).length!==1?"s":""} agora
            </div>
          </>
        )}
      </Card>
    </div>
  );
}



// ── PRIMEIRO CADASTRO ─────────────────────────────────────────────────────────
async function markCadastroCompleto(userId) {
  try {
    const r = await storageGet("church_auth");
    if (r?.value) {
      const auth = JSON.parse(r.value);
      auth.admins = auth.admins.map(a => a.id === userId ? {...a, cadastroCompleto:true} : a);
      await storageSet("church_auth", JSON.stringify(auth));
    }
  } catch(e) {}
}
