// ═══ membros.js — MembrosView, FamiliaTab, RelatorioView, ConservaView, WhatsAppView ═══

function MembrosView({members, setMembers, save, showToast, currentUser, isAdmin, congregacoes=[], criancas=[], setNav}) {
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MEMBER);
  const [search, setSearch] = useState("");
  const [fCargo, setFCargo] = useState("");
  const [fMin, setFMin] = useState("");
  const [fAtivo, setFAtivo] = useState("ativos");
  const [delConfirm, setDelConfirm] = useState(null);
  const [saidaModal, setSaidaModal] = useState(null);
  const [saidaForm, setSaidaForm] = useState({motivo:"",obs:""});
  const [tab, setTab] = useState("pessoal");
  const hf = (k,v) => setForm(f => ({...f,[k]:v}));

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    return (!search||m.nome.toLowerCase().includes(q)||m.cpf?.includes(q)||m.telefone?.includes(q)||m.email?.toLowerCase().includes(q))
      && (!fCargo||m.cargo===fCargo) && (!fMin||m.ministerio===fMin)
      && (fAtivo==="todos"||(fAtivo==="ativos"?m.ativo:!m.ativo));
  });

  function openNew() { setForm({...EMPTY_MEMBER,id:Date.now()}); setEditing(null); setTab("pessoal"); setView("form"); }
  function openEdit(m) { setForm({...m}); setEditing(m.id); setTab("pessoal"); setView("form"); }
  async function openDetail(m) { setEditing(m); setView("detail"); }

  async function handleSave() {
    if (!form.nome.trim()) { showToast("Nome obrigatorio","error"); return; }
    const updated = editing ? members.map(m=>m.id===editing?form:m) : [...members,form];
    setMembers(updated); await save(updated);
    showToast(editing?"Atualizado!":"Cadastrado!"); setView("list");
  }

  async function handleDelete(id) {
    const updated = members.filter(m => m.id!==id);
    setMembers(updated); await save(updated);
    showToast("Removido","error"); setDelConfirm(null); setView("list");
  }

  async function enviarSaida() {
    if (!saidaForm.motivo) { showToast("Selecione motivo","error"); return; }
    const nova = {id:Date.now(),membroId:saidaModal.id,membroNome:saidaModal.nome,motivo:saidaForm.motivo,obs:saidaForm.obs,status:"pendente",por:currentUser.nome,em:hoje()};
    try {
      const rL2 = localStorage.getItem("church_saidas"); const r = rL2 ? {value:rL2} : await window.storage.get("church_saidas").catch(()=>null);
      const lista = r?.value ? JSON.parse(r.value) : [];
      const novaLista=[...lista,nova]; localStorage.setItem("church_saidas",JSON.stringify(novaLista)); await window.storage.set("church_saidas", JSON.stringify(novaLista));
      showToast("Solicitacao enviada para aprovacao","warn");
    } catch(e) { showToast("Erro","error"); }
    setSaidaModal(null); setSaidaForm({motivo:"",obs:""});
  }

  function exportCSV() {
    const f = ["nome","cpf","nascimento","sexo","estadoCivil","telefone","email","endereco","cidade","cep","cargo","ministerio","dataBatismo","dataMembresia","conjugeNome","filhos","ativo","observacoes"];
    const h = ["Nome","CPF","Nascimento","Sexo","Est.Civil","Telefone","Email","Endereco","Cidade","CEP","Cargo","Ministerio","Batismo","Membresia","Conjuge","Filhos","Ativo","Obs"];
    const csv = [h.join(","), ...filtered.map(m=>f.map(k=>`"${(m[k]||"").toString().replace(/"/g,'""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download="membros.csv"; a.click(); URL.revokeObjectURL(url);
    showToast("Exportado!");
  }

  if (view==="detail" && editing) {
    const m = editing;
    return (
      <div>
        <div style={{marginBottom:14}}><Btn color="gray" size="sm" onClick={()=>setView("list")}>← Voltar</Btn></div>
        <Card>
          <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:16,flexWrap:"wrap"}}>
            <Avatar nome={m.nome} foto={m.foto} size={72} />
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontWeight:800,fontSize:19}}>{m.nome}</span>
                <Badge label={m.cargo} />
                <span style={{background:m.ativo?"#dcfce7":"#f1f5f9",color:m.ativo?"#16a34a":"#64748b",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>{m.ativo?"Ativo":"Inativo"}</span>
                {isAniv(m.nascimento) && <span style={{background:"#fef9c3",color:"#854d0e",borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600}}>Aniversariante hoje!</span>}
              </div>
              <div style={{fontSize:13,color:"#64748b"}}>{m.ministerio!=="Nenhum"?m.ministerio+"":" "}{m.email?"  ·  "+m.email:""}</div>
              {m.congregacao&&<div style={{fontSize:12,color:"#7c3aed",fontWeight:600,marginTop:2}}>🏛 {m.congregacao}</div>}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Btn color="blue" size="sm" onClick={()=>openEdit(m)}>Editar</Btn>
              {isAdmin && m.ativo && <Btn color="yellow" size="sm" onClick={()=>setSaidaModal(m)}>Registrar Saida</Btn>}
              {isAdmin && <Btn color="red" size="sm" onClick={()=>setDelConfirm(m.id)}>Excluir</Btn>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["CPF",m.cpf],["Nascimento",ptDate(m.nascimento)],["Sexo",m.sexo],["Est.Civil",m.estadoCivil],["Telefone",m.telefone],["Email",m.email],["Endereco",m.endereco],["Cidade",(m.cidade||"")+" "+(m.cep||"")],["Batismo",ptDate(m.dataBatismo)],["Membresia",ptDate(m.dataMembresia)],["Conjuge",m.conjugeNome],["Filhos",m.filhos]].map(([l,v])=>v&&v.trim()?<div key={l} style={{padding:"8px 11px",background:"#f8fafc",borderRadius:8}}><div style={{fontSize:10,color:"#94a3b8",fontWeight:600,marginBottom:1}}>{l}</div><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>:null)}
          </div>
          {m.observacoes && <div style={{marginTop:12,padding:"9px 12px",background:"#fefce8",borderRadius:8,borderLeft:"4px solid #fbbf24",fontSize:13,color:"#78350f"}}>{m.observacoes}</div>}
          {m.historicoSaida?.length>0 && <div style={{marginTop:12}}><div style={{fontSize:11,fontWeight:700,color:"#94a3b8",marginBottom:6}}>HISTORICO DE SAIDA</div>{m.historicoSaida.map((h,i)=><div key={i} style={{padding:"7px 10px",background:"#fef2f2",borderRadius:7,fontSize:12,color:"#7f1d1d",marginBottom:3}}>{h.motivo} — {ptDate(h.em)} — {h.status}</div>)}</div>}
        </Card>
        {delConfirm && <Modal onClose={()=>setDelConfirm(null)} width={360}>
          <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Confirmar exclusao</div>
          <p style={{color:"#64748b",margin:"0 0 18px"}}>Esta acao nao pode ser desfeita.</p>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn color="gray" onClick={()=>setDelConfirm(null)}>Cancelar</Btn><Btn color="red" onClick={()=>handleDelete(delConfirm)}>Excluir</Btn></div>
        </Modal>}
        {saidaModal && <Modal onClose={()=>setSaidaModal(null)} width={400}>
          <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Registrar Saida</div>
          <p style={{color:"#64748b",fontSize:13,margin:"0 0 16px"}}>Membro: <b>{saidaModal.nome}</b><br/>A solicitacao sera enviada para aprovacao do admin.</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Motivo"><select style={SEL} value={saidaForm.motivo} onChange={e=>setSaidaForm(f=>({...f,motivo:e.target.value}))}><option value="">Selecione...</option>{MOTIVOS_SAIDA.map(m=><option key={m}>{m}</option>)}</select></Field>
            <Field label="Observacoes"><textarea style={{...INP,minHeight:64,resize:"vertical"}} value={saidaForm.obs} onChange={e=>setSaidaForm(f=>({...f,obs:e.target.value}))} placeholder="Detalhes..." /></Field>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn color="gray" onClick={()=>setSaidaModal(null)}>Cancelar</Btn><Btn color="red" onClick={enviarSaida}>Solicitar Saida</Btn></div>
        </Modal>}

      {/* ── Crianças cadastradas ─────────────────────────────────────────── */}
      {criancas.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>👶</span>
              <span style={{fontWeight:700,fontSize:15,color:"#1e293b"}}>Crianças</span>
              <span style={{background:"#ede9fe",color:"#7c3aed",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>{criancas.length}</span>
            </div>
            <button onClick={()=>setNav("infantil")} style={{
              background:"none",border:"1px solid #e2e8f0",borderRadius:8,
              padding:"5px 12px",fontSize:12,color:"#7c3aed",fontWeight:600,cursor:"pointer"}}>
              Ver tudo →
            </button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {criancas.slice(0,10).map(c => {
              const idade = c.nascimento ? (() => {
                const d = new Date(c.nascimento+"T12:00");
                const anos = Math.floor((new Date()-d)/31557600000);
                return anos < 1 ? "< 1 ano" : anos+" ano"+(anos!==1?"s":"");
              })() : "";
              return (
                <div key={c.id} style={{
                  background:"#fff",borderRadius:12,padding:"10px 14px",
                  boxShadow:"0 1px 4px rgba(0,0,0,0.06)",border:"1px solid #f1f5f9",
                  display:"flex",alignItems:"center",gap:12,
                  borderLeft:"3px solid #7c3aed"
                }}>
                  <div style={{width:36,height:36,borderRadius:"50%",
                    background:"linear-gradient(135deg,#7c3aed,#a855f7)",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    color:"#fff",fontWeight:700,fontSize:14,flexShrink:0}}>
                    {c.nome[0]?.toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13,color:"#1e293b"}}>{c.nome}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2,alignItems:"center"}}>
                      {idade && <span style={{fontSize:11,color:"#64748b"}}>{idade}</span>}
                      <span style={{fontSize:11,color:"#64748b"}}>· {c.responsavel1}</span>
                      {c.tipo==="visitante" && (
                        <span style={{fontSize:10,background:"#fef3c7",color:"#92400e",borderRadius:10,padding:"1px 6px",fontWeight:600}}>Visitante</span>
                      )}
                      {c.congregacao && (
                        <span style={{fontSize:10,background:"#ede9fe",color:"#7c3aed",borderRadius:10,padding:"1px 6px",fontWeight:600}}>🏛 {c.congregacao}</span>
                      )}
                      {c.checkin && (
                        <span style={{fontSize:10,background:"#dcfce7",color:"#16a34a",borderRadius:10,padding:"1px 6px",fontWeight:600}}>✓ Na salinha</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {criancas.length > 10 && (
              <button onClick={()=>setNav("infantil")} style={{
                background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:12,
                padding:"12px",color:"#7c3aed",fontWeight:600,fontSize:13,cursor:"pointer",
                textAlign:"center"}}>
                Ver mais {criancas.length-10} criança{criancas.length-10!==1?"s":""}...
              </button>
            )}
          </div>
        </div>
      )}
      </div>
    );
  }

  if (view==="form") {
    const tabs = [{id:"pessoal",l:"Pessoal"},{id:"contato",l:"Contato"},{id:"ministerial",l:"Ministerial"},{id:"familia",l:"Familia"}];
    return (
      <div style={{maxWidth:660,margin:"0 auto"}}>
        <div style={{marginBottom:14}}><Btn color="gray" size="sm" onClick={()=>setView("list")}>← Voltar</Btn></div>
        <Card>
          <div style={{paddingBottom:14,borderBottom:"1px solid #f1f5f9",marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:17,marginBottom:12}}>{editing?"Editar Membro":"Novo Membro"}</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 13px",border:"none",cursor:"pointer",fontWeight:600,fontSize:13,borderRadius:8,background:tab===t.id?"#2563eb":"transparent",color:tab===t.id?"#fff":"#64748b"}}>{t.l}</button>)}
            </div>
          </div>
          {tab==="pessoal" && <>
            <div style={{display:"flex",gap:14,padding:12,background:"#f8fafc",borderRadius:10,marginBottom:14,alignItems:"center"}}>
              <Avatar nome={form.nome} foto={form.foto} size={60} />
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  {/* Câmera — abre câmera traseira diretamente no celular */}
                  <div style={{position:"relative"}}>
                    <input type="file" accept="image/*" capture="environment" id="f-camera"
                      style={{display:"none"}}
                      onChange={async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{const resized=await resizeFoto(ev.target.result);hf("foto",resized);};r.readAsDataURL(f);}} />
                    <label htmlFor="f-camera" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"linear-gradient(135deg,#742a28,#8b3230)",color:"#fff",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                      📷 Câmera
                    </label>
                  </div>
                  {/* Galeria — escolher da galeria */}
                  <div style={{position:"relative"}}>
                    <input type="file" accept="image/*" id="f-foto"
                      style={{display:"none"}}
                      onChange={async e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{const resized=await resizeFoto(ev.target.result);hf("foto",resized);};r.readAsDataURL(f);}} />
                    <label htmlFor="f-foto" style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#e2e8f0",color:"#475569",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
                      🖼️ Galeria
                    </label>
                  </div>
                  {form.foto && (
                    <button onClick={()=>hf("foto",null)}
                      style={{padding:"7px 10px",background:"#fee2e2",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,color:"#dc2626",fontSize:12}}>
                      ✕
                    </button>
                  )}
                </div>
                <div style={{fontSize:11,color:"#94a3b8"}}>Foto comprimida automaticamente</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}><Field label="Nome *"><input style={INP} value={form.nome} onChange={e=>hf("nome",e.target.value)} /></Field></div>
              <Field label="CPF"><input style={INP} value={form.cpf} onChange={e=>hf("cpf",fCPF(e.target.value))} placeholder="000.000.000-00" /></Field>
              <Field label="Nascimento"><input type="date" style={INP} value={form.nascimento} onChange={e=>hf("nascimento",e.target.value)} /></Field>
              <Field label="Sexo"><select style={SEL} value={form.sexo} onChange={e=>hf("sexo",e.target.value)}><option value="">Selecione</option><option>Masculino</option><option>Feminino</option></select></Field>
              <Field label="Estado Civil"><select style={SEL} value={form.estadoCivil} onChange={e=>hf("estadoCivil",e.target.value)}><option value="">Selecione</option><option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viuvo(a)</option></select></Field>
            </div>
          </>}
          {tab==="contato" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Telefone/WhatsApp"><input style={INP} value={form.telefone} onChange={e=>hf("telefone",fTel(e.target.value))} placeholder="(00) 00000-0000" /></Field>
            <Field label="Email"><input type="email" style={INP} value={form.email} onChange={e=>hf("email",e.target.value)} /></Field>
            <div style={{gridColumn:"1/-1"}}><Field label="Endereco"><input style={INP} value={form.endereco} onChange={e=>hf("endereco",e.target.value)} placeholder="Rua, numero, bairro" /></Field></div>
            <Field label="Cidade"><input style={INP} value={form.cidade} onChange={e=>hf("cidade",e.target.value)} /></Field>
            <Field label="CEP"><input style={INP} value={form.cep} onChange={e=>hf("cep",fCEP(e.target.value))} placeholder="00000-000" /></Field>
          </div>}
          {tab==="ministerial" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Field label="Cargo"><select style={SEL} value={form.cargo} onChange={e=>hf("cargo",e.target.value)}>{CARGOS.map(c=><option key={c}>{c}</option>)}</select></Field>
            <Field label="Ministerio"><select style={SEL} value={form.ministerio} onChange={e=>hf("ministerio",e.target.value)}>{MINISTERIOS.map(m=><option key={m}>{m}</option>)}</select></Field>
            <div style={{gridColumn:"1/-1"}}>
              <Field label="Congregação">
                <select style={SEL} value={form.congregacao||""} onChange={e=>hf("congregacao",e.target.value)}>
                  <option value="">Selecione a congregação...</option>
                  {congregacoes.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Data Batismo"><input type="date" style={INP} value={form.dataBatismo} onChange={e=>hf("dataBatismo",e.target.value)} /></Field>
            <Field label="Data Membresia"><input type="date" style={INP} value={form.dataMembresia} onChange={e=>hf("dataMembresia",e.target.value)} /></Field>
            <div style={{gridColumn:"1/-1"}}><Field label="Observacoes"><textarea style={{...INP,minHeight:64,resize:"vertical"}} value={form.observacoes} onChange={e=>hf("observacoes",e.target.value)} /></Field></div>
          </div>}
          {tab==="familia" && <FamiliaTab form={form} hf={hf} members={members} />}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:18,paddingTop:14,borderTop:"1px solid #f1f5f9"}}>
            <Btn color="gray" onClick={()=>setView("list")}>Cancelar</Btn>
            <Btn color="blue" onClick={handleSave}>{editing?"Atualizar":"Cadastrar"}</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Total",v:members.length,c:"#2563eb"},{l:"Ativos",v:members.filter(m=>m.ativo).length,c:"#059669"},{l:"Inativos",v:members.filter(m=>!m.ativo).length,c:"#64748b"},{l:"Aniversariantes",v:anivMes(members).length,c:"#d97706"}].map(s=>(
          <Card key={s.l} border={`3px solid ${s.c}33`}>
            <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:500,marginTop:2}}>{s.l}</div>
          </Card>
        ))}
      </div>
      <Card pad={0}>
        <div style={{padding:"12px 14px",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid #f1f5f9"}}>
          <input style={{...INP,flex:1,minWidth:130}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)} />
          <select style={{...SEL,width:"auto"}} value={fCargo} onChange={e=>setFCargo(e.target.value)}><option value="">Cargos</option>{CARGOS.map(c=><option key={c}>{c}</option>)}</select>
          <select style={{...SEL,width:"auto"}} value={fMin} onChange={e=>setFMin(e.target.value)}><option value="">Ministerios</option>{MINISTERIOS.map(m=><option key={m}>{m}</option>)}</select>
          <select style={{...SEL,width:"auto"}} value={fAtivo} onChange={e=>setFAtivo(e.target.value)}><option value="todos">Todos</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option></select>
          <Btn color="gray" size="sm" onClick={exportCSV}>CSV</Btn>
          <Btn color="blue" size="sm" onClick={openNew}>+ Novo</Btn>
        </div>
        {filtered.length===0
          ? <div style={{textAlign:"center",padding:44,color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:8}}>🏛</div><div style={{fontWeight:600}}>{members.length===0?"Nenhum membro":"Nenhum resultado"}</div>{members.length===0&&<div style={{marginTop:12}}><Btn color="blue" size="sm" onClick={openNew}>Cadastrar primeiro membro</Btn></div>}</div>
          : filtered.map(m=>(
            <div key={m.id} className="mrow" style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px",borderBottom:"1px solid #f8fafc",cursor:"pointer"}} onClick={()=>openDetail(m)}>
              <Avatar nome={m.nome} foto={m.foto} size={40} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <span style={{fontWeight:600,fontSize:14}}>{m.nome}</span>
                  <Badge label={m.cargo} />
                  {!m.ativo && <span style={{background:"#f1f5f9",color:"#64748b",borderRadius:20,padding:"1px 8px",fontSize:10,fontWeight:600}}>Inativo</span>}
                  {isAniv(m.nascimento) && <span style={{fontSize:13}}>🎂</span>}
                </div>
                <div style={{fontSize:12,color:"#64748b",marginTop:1}}>{m.ministerio!=="Nenhum"&&m.ministerio+" · "}{m.telefone}</div>
              </div>
              <div style={{display:"flex",gap:5}} onClick={e=>e.stopPropagation()}>
                <Btn color="gray" size="sm" onClick={()=>openEdit(m)}>Editar</Btn>
                {m.ativo && <Btn color="yellow" size="sm" onClick={()=>setSaidaModal(m)}>Saida</Btn>}
              </div>
            </div>
          ))
        }
        {filtered.length>0 && <div style={{padding:"7px 14px",fontSize:11,color:"#94a3b8",borderTop:"1px solid #f8fafc"}}>{filtered.length} membro{filtered.length!==1?"s":""}</div>}
      </Card>
      {saidaModal && <Modal onClose={()=>setSaidaModal(null)} width={400}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>Registrar Saida</div>
        <p style={{color:"#64748b",fontSize:13,margin:"0 0 16px"}}>Membro: <b>{saidaModal.nome}</b></p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Motivo"><select style={SEL} value={saidaForm.motivo} onChange={e=>setSaidaForm(f=>({...f,motivo:e.target.value}))}><option value="">Selecione...</option>{MOTIVOS_SAIDA.map(m=><option key={m}>{m}</option>)}</select></Field>
          <Field label="Observacoes"><textarea style={{...INP,minHeight:60,resize:"vertical"}} value={saidaForm.obs} onChange={e=>setSaidaForm(f=>({...f,obs:e.target.value}))} /></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn color="gray" onClick={()=>setSaidaModal(null)}>Cancelar</Btn><Btn color="red" onClick={enviarSaida}>Solicitar Saida</Btn></div>
      </Modal>}
    </div>
  );
}

// ── RELATORIO ──────────────────────────────────────────────────────────────────
function RelatorioView({members}) {
  const [periodo, setPeriodo] = useState("semanal");
  const [mes, setMes] = useState(new Date().getMonth());
  const lista = periodo==="semanal" ? anivSemana(members) : anivMes(members,mes);
  const {ini,fim} = semanaAtual();

  function gerarPDF() {
    const sufixo = fCongRel ? " — "+fCongRel : "";
    const titulo = periodo==="semanal"
      ? "Aniversariantes da Semana ("+ini.toLocaleDateString("pt-BR")+" - "+fim.toLocaleDateString("pt-BR")+")"+sufixo
      : "Aniversariantes de "+MESES_PT[mes];
    if (window.jspdf) { buildPDF(titulo); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => buildPDF(titulo);
    document.head.appendChild(s);
  }

  function buildPDF(titulo) {
    const {jsPDF} = window.jspdf;
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30,58,95); doc.rect(0,0,W,34,"F");
    doc.setTextColor(255,255,255); doc.setFontSize(15); doc.setFont("helvetica","bold");
    doc.text("Igreja - Relatorio de Aniversariantes", W/2, 13, {align:"center"});
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text(titulo, W/2, 24, {align:"center"});
    doc.setTextColor(30,41,59);
    let y = 46;
    if (!lista.length) {
      doc.setFontSize(12); doc.text("Nenhum aniversariante neste periodo.", W/2, y, {align:"center"});
    } else {
      doc.setFillColor(241,245,249); doc.rect(14,y-6,W-28,10,"F");
      doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(100,116,139);
      doc.text("NOME",16,y); doc.text("DATA",80,y); doc.text("CARGO",100,y); doc.text("CONGR.",138,y); doc.text("TELEFONE",176,y);
      y+=7; doc.setFont("helvetica","normal"); doc.setTextColor(30,41,59); doc.setFontSize(10);
      [...lista].sort((a,b)=>new Date(a.nascimento+"T00:00").getDate()-new Date(b.nascimento+"T00:00").getDate()).forEach((m,i)=>{
        if (y>272) { doc.addPage(); y=20; }
        if (i%2===0) { doc.setFillColor(248,250,252); doc.rect(14,y-5,W-28,10,"F"); }
        if (isAniv(m.nascimento)) doc.setTextColor(217,119,6); else doc.setTextColor(30,41,59);
        doc.text(m.nome.slice(0,28)+(isAniv(m.nascimento)?" *":""),16,y);
        if(m.congregacao){doc.setFontSize(7);doc.setTextColor(124,58,237);doc.text((m.congregacao).slice(0,18),138,y);doc.setFontSize(10);doc.setTextColor(30,41,59);}
        doc.setTextColor(30,41,59);
        const dia = new Date(m.nascimento+"T00:00");
        doc.text(String(dia.getDate()).padStart(2,"0")+"/"+String(dia.getMonth()+1).padStart(2,"0"),90,y);
        doc.text(m.cargo.slice(0,16),112,y);
        doc.text((m.ministerio!=="Nenhum"?m.ministerio:"--").slice(0,14),150,y);
        doc.text(m.telefone||"--",186,y);
        y+=9;
      });
    }
    doc.setFontSize(8); doc.setTextColor(148,163,184);
    doc.text("Gerado em "+new Date().toLocaleDateString("pt-BR")+" - Total: "+lista.length, W/2, 286, {align:"center"});
    doc.save("aniversariantes_"+periodo+".pdf");
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{fontWeight:700,fontSize:16}}>Relatorio de Aniversariantes</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",background:"#f1f5f9",borderRadius:8,overflow:"hidden"}}>
            {["semanal","mensal"].map(p=><button key={p} onClick={()=>setPeriodo(p)} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:periodo===p?"#2563eb":"transparent",color:periodo===p?"#fff":"#64748b"}}>{p==="semanal"?"Semanal":"Mensal"}</button>)}
          </div>
          {periodo==="mensal" && <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={{...SEL,width:"auto"}}>{MESES_PT.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>}
          <Btn color="blue" size="sm" onClick={gerarPDF}>Gerar PDF</Btn>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Total",v:lista.length,c:"#2563eb"},{l:"Hoje",v:lista.filter(m=>isAniv(m.nascimento)).length,c:"#d97706"},{l:"Com WhatsApp",v:lista.filter(m=>m.telefone).length,c:"#25d366"}].map(s=>(
          <Card key={s.l} border={`3px solid ${s.c}33`}>
            <div style={{fontSize:22,fontWeight:800,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:"#94a3b8",fontWeight:500,marginTop:2}}>{s.l}</div>
          </Card>
        ))}
      </div>
      {periodo==="semanal" && <div style={{padding:"9px 14px",background:"#eff6ff",borderRadius:10,border:"1px solid #bfdbfe",marginBottom:12,fontSize:13,color:"#1d4ed8",fontWeight:500}}>{ini.toLocaleDateString("pt-BR")} ate {fim.toLocaleDateString("pt-BR")}</div>}
      <Card pad={0}>
        {lista.length===0
          ? <div style={{textAlign:"center",padding:40,color:"#94a3b8"}}><div style={{fontSize:36,marginBottom:8}}>🎂</div><div style={{fontWeight:600}}>Nenhum aniversariante</div></div>
          : [...lista].sort((a,b)=>new Date(a.nascimento+"T00:00").getDate()-new Date(b.nascimento+"T00:00").getDate()).map(m=>{
              const dia = new Date(m.nascimento+"T00:00").getDate();
              const h = isAniv(m.nascimento);
              return (
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px",borderBottom:"1px solid #f8fafc",background:h?"#fffbeb":"#fff"}}>
                  <div style={{width:26,textAlign:"center",fontWeight:800,fontSize:14,color:h?"#d97706":"#94a3b8"}}>{dia}</div>
                  <Avatar nome={m.nome} foto={m.foto} size={38} />
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                      <span style={{fontWeight:600,fontSize:14}}>{m.nome}</span>
                      {h && <span style={{background:"#fbbf24",color:"#78350f",borderRadius:10,padding:"1px 8px",fontSize:11,fontWeight:700}}>Hoje!</span>}
                      <Badge label={m.cargo} />
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:1}}>{MESES_PT[new Date(m.nascimento+"T00:00").getMonth()]}</div>
                  </div>
                  {m.telefone && <Btn color="green" size="sm" onClick={()=>{const msg=encodeURIComponent("Feliz Aniversario, "+m.nome.split(" ")[0]+"!\n\nEm nome da nossa Igreja, desejamos um abencado aniversario!\n\n\"O Senhor te abencoe e te guarde\" (Numeros 6:24)");window.open("https://wa.me/55"+rawTel(m.telefone)+"?text="+msg,"_blank");}}>WA</Btn>}
                </div>
              );
            })
        }
      </Card>
    </div>
  );
}

// ── CONSERVA ───────────────────────────────────────────────────────────────────
function ConservaView({members, showToast}) {
  const [escalas, setEscalas] = useState([]);
  const [modal, setModal] = useState(false);
  const [hist, setHist] = useState(false);
  const [form, setForm] = useState({id:null,semana:"",equipe:"",responsavel:"",membrosIds:[],obs:""});

  useEffect(()=>{(async()=>{try{const r=await window.storage.get("church_escalas");if(r?.value)setEscalas(JSON.parse(r.value));}catch(e){}})();},[]);
  const saveE = async l => { try{await window.storage.set("church_escalas",JSON.stringify(l));}catch(e){} };
  const semLabel = d => { const dt=new Date(d+"T00:00"); const f=new Date(dt); f.setDate(dt.getDate()+6); return dt.toLocaleDateString("pt-BR")+" - "+f.toLocaleDateString("pt-BR"); };

  async function salvar() {
    if (!form.semana||!form.equipe) { showToast("Semana e equipe obrigatorios","error"); return; }
    const u = form.id ? escalas.map(e=>e.id===form.id?form:e) : [...escalas,{...form,id:Date.now()}];
    setEscalas(u); await saveE(u); showToast("Escala salva!"); setModal(false);
  }

  async function excluir(id) { const u=escalas.filter(e=>e.id!==id); setEscalas(u); await saveE(u); showToast("Removida","error"); }

  function notif(e) {
    const ms = members.filter(m=>e.membrosIds?.includes(m.id)&&m.telefone);
    if (!ms.length) { showToast("Nenhum membro com telefone","error"); return; }
    ms.forEach((m,i)=>setTimeout(()=>{
      const msg = encodeURIComponent("Ola, "+m.nome.split(" ")[0]+"!\n\nEscala de Conserva:\nSemana: "+semLabel(e.semana)+"\nEquipe: "+e.equipe+"\n\n"+(e.obs||"Contamos com voce!")+"\n\nServindo com alegria!");
      window.open("https://wa.me/55"+rawTel(m.telefone)+"?text="+msg,"_blank");
    },i*600));
    showToast("Notificando "+ms.length+" membro(s)");
  }

  const agora = new Date();
  const prox = escalas.filter(e=>new Date(e.semana+"T00:00")>=agora).sort((a,b)=>a.semana.localeCompare(b.semana));
  const histList = escalas.filter(e=>new Date(e.semana+"T00:00")<agora).sort((a,b)=>b.semana.localeCompare(a.semana));

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{fontWeight:700,fontSize:16}}>Escala de Conserva / Obreiros</div>
        <div style={{display:"flex",gap:8}}>
          <Btn color="gray" size="sm" onClick={()=>setHist(!hist)}>{hist?"Ver Proximas":"Historico"}</Btn>
          <Btn color="blue" size="sm" onClick={()=>{setForm({id:null,semana:"",equipe:"",responsavel:"",membrosIds:[],obs:""});setModal(true);}}>+ Nova Escala</Btn>
        </div>
      </div>
      {!hist && (prox.length===0
        ? <Card><div style={{textAlign:"center",padding:36,color:"#94a3b8"}}><div style={{fontWeight:600}}>Nenhuma escala cadastrada</div></div></Card>
        : prox.map(e=>{const ms=members.filter(m=>e.membrosIds?.includes(m.id)); return(
          <Card key={e.id} gap={10}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div><div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{e.equipe}</div><div style={{fontSize:13,color:"#64748b"}}>{semLabel(e.semana)}</div>{e.responsavel&&<div style={{fontSize:12,color:"#64748b"}}>Responsavel: {e.responsavel}</div>}</div>
              <div style={{display:"flex",gap:6}}><Btn color="green" size="sm" onClick={()=>notif(e)}>WA Notif.</Btn>{isAdmin && <Btn color="gray" size="sm" onClick={()=>{setForm({...e});setModal(true);}}>Editar</Btn>}{isAdmin && <Btn color="red" size="sm" onClick={()=>excluir(e.id)}>Remover</Btn>}</div>
            </div>
            {ms.length>0&&<div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>{ms.map(m=><div key={m.id} style={{display:"flex",alignItems:"center",gap:5,background:"#f8fafc",borderRadius:6,padding:"3px 8px"}}><Avatar nome={m.nome} foto={m.foto} size={22}/><span style={{fontSize:11,fontWeight:500}}>{m.nome.split(" ")[0]}</span></div>)}</div>}
            {e.obs&&<div style={{marginTop:8,padding:"6px 10px",background:"#fffbeb",borderRadius:6,fontSize:12,color:"#92400e",borderLeft:"3px solid #fbbf24"}}>{e.obs}</div>}
          </Card>
        );})
      )}
      {hist && (histList.length===0
        ? <Card><div style={{textAlign:"center",padding:28,color:"#94a3b8"}}>Sem historico.</div></Card>
        : histList.map(e=><Card key={e.id} gap={8}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontWeight:600,fontSize:13}}>{e.equipe}</div><div style={{fontSize:11,color:"#94a3b8"}}>{semLabel(e.semana)}</div></div><span style={{background:"#f1f5f9",color:"#64748b",borderRadius:8,padding:"2px 10px",fontSize:11,fontWeight:600}}>Concluida</span></div></Card>)
      )}
      {modal && <Modal onClose={()=>setModal(false)} width={480}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{form.id?"Editar":"Nova"} Escala</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Semana (inicio - domingo)"><input type="date" style={INP} value={form.semana} onChange={e=>setForm(f=>({...f,semana:e.target.value}))} /></Field>
          <Field label="Equipe"><input style={INP} value={form.equipe} onChange={e=>setForm(f=>({...f,equipe:e.target.value}))} placeholder="Ex: Equipe A" /></Field>
          <Field label="Responsavel"><input style={INP} value={form.responsavel} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))} /></Field>
          <Field label="Membros Escalados">
            <div style={{maxHeight:170,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:8}}>
              {members.filter(m=>m.ativo&&m.telefone).map(m=>(
                <label key={m.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 11px",borderBottom:"1px solid #f8fafc",cursor:"pointer"}}>
                  <input type="checkbox" checked={form.membrosIds?.includes(m.id)||false} onChange={e=>setForm(f=>({...f,membrosIds:e.target.checked?[...(f.membrosIds||[]),m.id]:(f.membrosIds||[]).filter(id=>id!==m.id)}))} style={{accentColor:"#2563eb",width:14,height:14}} />
                  <Avatar nome={m.nome} foto={m.foto} size={24} />
                  <div><div style={{fontWeight:600,fontSize:12}}>{m.nome}</div><div style={{fontSize:10,color:"#94a3b8"}}>{m.cargo}</div></div>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Observacoes"><textarea style={{...INP,minHeight:60,resize:"vertical"}} value={form.obs} onChange={e=>setForm(f=>({...f,obs:e.target.value}))} /></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}><Btn color="gray" onClick={()=>setModal(false)}>Cancelar</Btn><Btn color="blue" onClick={salvar}>Salvar</Btn></div>
      </Modal>}
    </div>
  );
}

// ── AGENDA ─────────────────────────────────────────────────────────────────────
function WhatsAppView({members}) {
  const [step, setStep] = useState("template");
  const [selT, setSelT] = useState(null);
  const [tipoD, setTipoD] = useState("todos_ativos");
  const [fMin, setFMin] = useState("");
  const [fCarg, setFCarg] = useState("");
  const [selIds, setSelIds] = useState([]);
  const [vars, setVars] = useState({data:"",horario:"",local:"",mensagem:"",titulo_evento:""});
  const [enviados, setEnviados] = useState([]);
  const STEPS = ["template","destinatarios","personalizar","enviar"];
  const LABELS = ["Modelo","Destinatarios","Mensagem","Enviar"];
  const meses = ["janeiro","fevereiro","marco","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

  function getDest() {
    if (tipoD==="todos_ativos") return members.filter(m=>m.ativo&&m.telefone);
    if (tipoD==="aniversariantes") return anivMes(members).filter(m=>m.telefone);
    if (tipoD==="ministerio") return members.filter(m=>m.ativo&&m.ministerio===fMin&&m.telefone);
    if (tipoD==="cargo") return members.filter(m=>m.ativo&&m.cargo===fCarg&&m.telefone);
    if (tipoD==="manual") return members.filter(m=>selIds.includes(m.id)&&m.telefone);
    return [];
  }

  function buildMsg(t, m, v) {
    return t.texto.replace(/{nome}/g,m.nome.split(" ")[0]).replace(/{ministerio}/g,m.ministerio).replace(/{data}/g,v.data||"a confirmar").replace(/{horario}/g,v.horario||"a confirmar").replace(/{local}/g,v.local||"nossa Igreja").replace(/{mensagem}/g,v.mensagem||"").replace(/{titulo_evento}/g,v.titulo_evento||"Evento Especial");
  }

  const dest = getDest();

  return (
    <div>
      <div style={{background:"#fff",borderRadius:12,padding:"11px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",marginBottom:16,display:"flex",alignItems:"center"}}>
        {LABELS.map((label,i)=>{
          const sid=STEPS[i]; const active=step===sid; const done=STEPS.indexOf(step)>i;
          return (
            <div key={sid} style={{display:"flex",alignItems:"center",flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:done?"#059669":active?"#25d366":"#e2e8f0",color:done||active?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,flexShrink:0}}>{done?"✓":i+1}</div>
                <span style={{fontSize:12,fontWeight:active?700:500,color:active?"#1e293b":done?"#059669":"#94a3b8",whiteSpace:"nowrap"}}>{label}</span>
              </div>
              {i<3 && <div style={{flex:1,height:2,background:done?"#059669":"#e2e8f0",margin:"0 6px"}} />}
            </div>
          );
        })}
      </div>

      {step==="template" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:10}}>
          {TEMPLATES.map(t => (
            <div key={t.id} onClick={()=>{setSelT(t);setStep("destinatarios");}} style={{background:"#fff",borderRadius:12,padding:14,cursor:"pointer",border:"2px solid transparent",boxShadow:"0 1px 4px rgba(0,0,0,0.06)",transition:"all 0.18s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#25d366";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="transparent";}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{t.titulo}</div>
              <div style={{fontSize:11,color:"#64748b",lineHeight:1.5,maxHeight:50,overflow:"hidden"}}>{t.texto.slice(0,80)}...</div>
              <div style={{marginTop:8,textAlign:"right"}}><span style={{background:"#dcfce7",color:"#16a34a",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>Usar</span></div>
            </div>
          ))}
        </div>
      )}

      {step==="destinatarios" && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Para quem enviar?</div>
          <Card gap={14}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
              {[{id:"todos_ativos",l:"Todos ativos",c:members.filter(m=>m.ativo&&m.telefone).length},{id:"aniversariantes",l:"Aniversariantes de "+meses[new Date().getMonth()],c:anivMes(members).filter(m=>m.telefone).length},{id:"ministerio",l:"Por Ministerio",c:null},{id:"cargo",l:"Por Cargo",c:null},{id:"manual",l:"Selecionar",c:null}].map(op=>(
                <div key={op.id} onClick={()=>setTipoD(op.id)} style={{padding:10,borderRadius:8,border:"2px solid",borderColor:tipoD===op.id?"#25d366":"#e2e8f0",cursor:"pointer",background:tipoD===op.id?"#f0fdf4":"#fff"}}>
                  <div style={{fontWeight:600,fontSize:12}}>{op.l}</div>
                  {op.c!==null && <div style={{fontSize:10,color:"#25d366",fontWeight:700,marginTop:1}}>{op.c} com tel.</div>}
                </div>
              ))}
            </div>
            {tipoD==="ministerio" && <div style={{marginBottom:10}}><select style={SEL} value={fMin} onChange={e=>setFMin(e.target.value)}><option value="">Selecione...</option>{MINISTERIOS.filter(m=>m!=="Nenhum").map(m=><option key={m}>{m}</option>)}</select></div>}
            {tipoD==="cargo" && <div style={{marginBottom:10}}><select style={SEL} value={fCarg} onChange={e=>setFCarg(e.target.value)}><option value="">Selecione...</option>{CARGOS.map(c=><option key={c}>{c}</option>)}</select></div>}
            {tipoD==="manual" && <div style={{maxHeight:160,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:8,marginBottom:10}}>{members.filter(m=>m.telefone).map(m=><label key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderBottom:"1px solid #f8fafc",cursor:"pointer"}}><input type="checkbox" checked={selIds.includes(m.id)} onChange={e=>setSelIds(p=>e.target.checked?[...p,m.id]:p.filter(id=>id!==m.id))} style={{accentColor:"#25d366",width:14,height:14}} /><Avatar nome={m.nome} foto={m.foto} size={26} /><div><div style={{fontWeight:600,fontSize:12}}>{m.nome}</div><div style={{fontSize:10,color:"#94a3b8"}}>{m.telefone}</div></div></label>)}</div>}
            <div style={{padding:10,background:"#f0fdf4",borderRadius:8,border:"1px solid #bbf7d0",fontSize:13,fontWeight:600,color:"#166534"}}>{dest.length} destinatario{dest.length!==1?"s":""} selecionado{dest.length!==1?"s":""}</div>
          </Card>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <Btn color="gray" onClick={()=>setStep("template")}>Voltar</Btn>
            <Btn color="green" disabled={!dest.length} onClick={()=>setStep("personalizar")}>Personalizar</Btn>
          </div>
        </div>
      )}

      {step==="personalizar" && selT && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Personalize a mensagem</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <div style={{fontWeight:700,fontSize:12,color:"#64748b",marginBottom:12,textTransform:"uppercase"}}>Variaveis</div>
              {selT.id==="aniversario"
                ? <div style={{padding:12,background:"#f0fdf4",borderRadius:8,color:"#166534",fontSize:13}}>Mensagem automatica! Sera personalizada com o nome de cada membro.</div>
                : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {[["titulo_evento","Titulo do Evento",""],["data","Data","Ex: Domingo 09/03"],["horario","Horario","Ex: 19h"],["local","Local","Ex: Templo Central"]].map(([k,l,ph])=>selT.texto.includes("{"+k+"}")&&<Field key={k} label={l}><input style={INP} value={vars[k]||""} onChange={e=>setVars(v=>({...v,[k]:e.target.value}))} placeholder={ph} /></Field>)}
                    <Field label="Mensagem adicional"><textarea style={{...INP,minHeight:60,resize:"vertical"}} value={vars.mensagem} onChange={e=>setVars(v=>({...v,mensagem:e.target.value}))} /></Field>
                  </div>
              }
            </Card>
            <Card>
              <div style={{fontWeight:700,fontSize:12,color:"#64748b",marginBottom:12,textTransform:"uppercase"}}>Previa</div>
              <div style={{background:"#e5ddd5",borderRadius:10,padding:10,minHeight:140}}>
                <div style={{background:"#dcf8c6",borderRadius:"10px 10px 2px 10px",padding:"9px 12px",fontSize:11,lineHeight:1.7,whiteSpace:"pre-line",maxWidth:"90%",marginLeft:"auto",boxShadow:"0 1px 2px rgba(0,0,0,0.1)"}}>
                  {dest[0] ? buildMsg(selT,{nome:dest[0].nome,ministerio:dest[0].ministerio||"Louvor"},vars) : "Selecione destinatarios primeiro"}
                </div>
              </div>
            </Card>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
            <Btn color="gray" onClick={()=>setStep("destinatarios")}>Voltar</Btn>
            <Btn color="green" onClick={()=>{setEnviados(dest);setStep("enviar");}}>Ir para Envio</Btn>
          </div>
        </div>
      )}

      {step==="enviar" && (
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:14}}>Enviar mensagens</div>
          <Card gap={14}>
            <div style={{display:"flex",alignItems:"center",gap:14,padding:12,background:"#f0fdf4",borderRadius:10,marginBottom:12,border:"1px solid #bbf7d0",flexWrap:"wrap"}}>
              <div style={{flex:1}}><div style={{fontWeight:700,color:"#166534"}}>Pronto para enviar!</div><div style={{fontSize:12,color:"#16a34a"}}>{enviados.length} mensagen{enviados.length!==1?"s":"m"} - {selT?.titulo}</div></div>
              <Btn color="green" onClick={()=>enviados.forEach((m,i)=>setTimeout(()=>{window.open("https://wa.me/55"+rawTel(m.telefone)+"?text="+encodeURIComponent(buildMsg(selT,m,vars)),"_blank");},i*700))}>Enviar todos</Btn>
            </div>
            <div style={{fontSize:11,color:"#92400e",background:"#fffbeb",borderRadius:7,padding:"8px 11px",marginBottom:12}}>O WhatsApp abre para cada membro. Se o navegador bloquear popups, permita-os ou envie um por um abaixo.</div>
            <div style={{maxHeight:320,overflowY:"auto"}}>
              {enviados.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid #f8fafc"}}>
                  <Avatar nome={m.nome} foto={m.foto} size={36} />
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{m.nome}</div><div style={{fontSize:11,color:"#94a3b8"}}>{m.telefone}</div></div>
                  <Btn color="green" size="sm" onClick={()=>window.open("https://wa.me/55"+rawTel(m.telefone)+"?text="+encodeURIComponent(buildMsg(selT,m,vars)),"_blank")}>Enviar</Btn>
                </div>
              ))}
            </div>
          </Card>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn color="gray" onClick={()=>setStep("personalizar")}>Voltar</Btn>
            <Btn color="blue" onClick={()=>setStep("template")}>Nova mensagem</Btn>
          </div>
        </div>
      )}
    </div>
  );
}


// ── GESTÃO INFANTIL ────────────────────────────────────────────────────────────
const EMPTY_CRIANCA = {id:null,nome:"",nascimento:"",sexo:"",tipo:"membro",membroId:null,responsavel1:"",tel1:"",responsavel2:"",tel2:"",congregacao:"",alergia:"",observacoes:"",foto:null,checkin:false,checkinHora:""};

const WA_TEMPLATES = [
  {id:"checkin",   emoji:"✅", label:"Check-in realizado",  cor:"#dcfce7", borda:"#bbf7d0", texto:"#16a34a",
   msg:(c)=>`Ola, {resp}!\n\n${c.nome} acabou de fazer check-in na *Salinha Infantil* as ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}.\n\nEle(a) esta bem e sob cuidado dos monitores. ✝\n\n_Igreja - Ministerio Infantil_`},
  {id:"buscar",    emoji:"🔔", label:"Hora de buscar",      cor:"#fef9c3", borda:"#fde68a", texto:"#92400e",
   msg:(c)=>`Ola, {resp}!\n\nO culto esta chegando ao fim. Por favor, venha buscar *${c.nome}* na Salinha Infantil.\n\nObrigado! ✝\n\n_Igreja - Ministerio Infantil_`},
  {id:"chamar",    emoji:"🚨", label:"Chamar responsavel",  cor:"#fef2f2", borda:"#fecaca", texto:"#dc2626",
   msg:(c)=>`Ola, {resp}!\n\nPrecisamos que voce venha urgente a *Salinha Infantil* por causa de ${c.nome}.\n\nObrigado! ✝`},
  {id:"aviso",     emoji:"📢", label:"Aviso geral",         cor:"#eff6ff", borda:"#bfdbfe", texto:"#2563eb",
   msg:(c)=>`Ola, {resp}!\n\nInformacao importante sobre ${c.nome} na Salinha Infantil.\n\nEm caso de duvidas, fale com um monitor. ✝\n\n_Igreja - Ministerio Infantil_`},
  {id:"aniver",    emoji:"🎂", label:"Parabens",            cor:"#fdf4ff", borda:"#e9d5ff", texto:"#7c3aed",
   msg:(c)=>`Parabens, ${c.nome}! 🎉🎂\n\nQue Deus abencoe cada dia da sua vida!\n\n_Com carinho, Igreja - Ministerio Infantil_ ✝`},
];
