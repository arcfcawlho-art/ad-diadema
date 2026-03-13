// ═══ agenda.js — AgendaView, calendário, eventos ═══

function AgendaView({members, showToast, isAdmin}) {
  const [eventos, setEventos] = useState([]);
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [modal, setModal] = useState(false);
  const [fMin, setFMin] = useState("");
  const [form, setForm] = useState({id:null,titulo:"",data:"",hora:"",local:"",ministerio:"",descricao:"",cor:"#2563eb"});

  useEffect(()=>{(async()=>{try{const r=await window.storage.get("church_eventos");if(r?.value)setEventos(JSON.parse(r.value));}catch(e){}})();},[]);
  const saveEv = async l => { try{await window.storage.set("church_eventos",JSON.stringify(l));}catch(e){} };

  const evMes = eventos.filter(e=>{const d=new Date(e.data+"T00:00");return d.getMonth()===mes&&d.getFullYear()===ano&&(!fMin||e.ministerio===fMin);}).sort((a,b)=>a.data.localeCompare(b.data));

  async function salvar() {
    if (!form.titulo||!form.data) { showToast("Titulo e data obrigatorios","error"); return; }
    const u = form.id ? eventos.map(e=>e.id===form.id?form:e) : [...eventos,{...form,id:Date.now()}];
    setEventos(u); await saveEv(u); showToast("Evento salvo!"); setModal(false);
  }
  async function excluir(id) { const u=eventos.filter(e=>e.id!==id); setEventos(u); await saveEv(u); showToast("Removido","error"); }

  function notifEv(ev) {
    const dest = members.filter(m=>m.ativo&&m.telefone&&(!ev.ministerio||m.ministerio===ev.ministerio));
    if (!dest.length) { showToast("Nenhum membro","error"); return; }
    dest.forEach((m,i)=>setTimeout(()=>{
      const msg = encodeURIComponent("Ola, "+m.nome.split(" ")[0]+"!\n\n"+ev.titulo+"\n\nData: "+ptDate(ev.data)+(ev.hora?" Horario: "+ev.hora:"")+(ev.local?"\nLocal: "+ev.local:"")+"\n\n"+(ev.descricao||"")+"\n\nDeus abencoe!");
      window.open("https://wa.me/55"+rawTel(m.telefone)+"?text="+msg,"_blank");
    },i*600));
    showToast("Notificando "+dest.length+" membro(s)");
  }

  const prim = new Date(ano,mes,1).getDay();
  const dias = new Date(ano,mes+1,0).getDate();
  const cels = Array(prim).fill(null).concat(Array.from({length:dias},(_,i)=>i+1));
  while(cels.length%7!==0) cels.push(null);

  function evsDia(dia) {
    if (!dia) return [];
    const ds = ano+"-"+String(mes+1).padStart(2,"0")+"-"+String(dia).padStart(2,"0");
    return eventos.filter(e=>e.data===ds&&(!fMin||e.ministerio===fMin));
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div style={{fontWeight:700,fontSize:16}}>Agenda de Atividades</div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select style={{...SEL,width:"auto"}} value={fMin} onChange={e=>setFMin(e.target.value)}><option value="">Todos ministerios</option>{MINISTERIOS.filter(m=>m!=="Nenhum").map(m=><option key={m}>{m}</option>)}</select>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <Btn color="ghost" size="sm" onClick={()=>{if(mes===0){setMes(11);setAno(a=>a-1);}else setMes(m=>m-1);}}>‹</Btn>
            <span style={{fontWeight:700,fontSize:13,minWidth:120,textAlign:"center"}}>{MESES_PT[mes]} {ano}</span>
            <Btn color="ghost" size="sm" onClick={()=>{if(mes===11){setMes(0);setAno(a=>a+1);}else setMes(m=>m+1);}}>›</Btn>
          </div>
          {isAdmin && <Btn color="blue" size="sm" onClick={()=>{setForm({id:null,titulo:"",data:ano+"-"+String(mes+1).padStart(2,"0")+"-01",hora:"",local:"",ministerio:"",descricao:"",cor:"#2563eb"});setModal(true);}}>+ Evento</Btn>}
        </div>
      </div>
      <Card gap={14}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {DIAS_SEMANA.map(d=><div key={d} style={{textAlign:"center",fontWeight:700,fontSize:10,color:"#94a3b8",padding:"4px 0",textTransform:"uppercase"}}>{d}</div>)}
          {cels.map((dia,i)=>{
            const evs = evsDia(dia);
            const isHoje = dia && new Date().getDate()===dia && new Date().getMonth()===mes && new Date().getFullYear()===ano;
            return (
              <div key={i} onClick={()=>{if(!dia||!isAdmin)return;setForm({id:null,titulo:"",data:ano+"-"+String(mes+1).padStart(2,"0")+"-"+String(dia).padStart(2,"0"),hora:"",local:"",ministerio:"",descricao:"",cor:"#2563eb"});setModal(true);}} style={{minHeight:58,borderRadius:6,padding:3,background:!dia?"transparent":isHoje?"#eff6ff":"#f8fafc",border:isHoje?"2px solid #2563eb":"2px solid transparent",cursor:dia?"pointer":"default"}}>
                {dia && <>
                  <div style={{fontWeight:isHoje?800:500,fontSize:12,color:isHoje?"#2563eb":"#374151",marginBottom:1}}>{dia}</div>
                  {evs.slice(0,2).map(ev=><div key={ev.id} onClick={e=>{e.stopPropagation();setForm({...ev});setModal(true);}} style={{background:ev.cor||"#2563eb",color:"#fff",borderRadius:3,fontSize:8,fontWeight:600,padding:"1px 3px",marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{ev.titulo}</div>)}
                  {evs.length>2 && <div style={{fontSize:8,color:"#64748b"}}>+{evs.length-2}</div>}
                </>}
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{fontWeight:700,fontSize:12,color:"#64748b",marginBottom:10}}>{MESES_PT[mes]} ({evMes.length} evento{evMes.length!==1?"s":""})</div>
      {evMes.length===0
        ? <Card><div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Nenhum evento. Clique em um dia ou em "+ Evento".</div></Card>
        : evMes.map(ev=>(
          <Card key={ev.id} gap={8}>
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:4,borderRadius:4,background:ev.cor||"#2563eb",alignSelf:"stretch",flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14}}>{ev.titulo}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{ptDate(ev.data)}{ev.hora&&" - "+ev.hora}{ev.local&&" - "+ev.local}</div>
                    {ev.ministerio&&<span style={{background:"#eff6ff",color:"#2563eb",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:600,marginTop:2,display:"inline-block"}}>{ev.ministerio}</span>}
                    {ev.descricao&&<div style={{fontSize:12,color:"#64748b",marginTop:3}}>{ev.descricao}</div>}
                  </div>
                  <div style={{display:"flex",gap:5}}>
                    <Btn color="green" size="sm" onClick={()=>notifEv(ev)}>WA</Btn>
                    <Btn color="gray" size="sm" onClick={()=>{setForm({...ev});setModal(true);}}>Editar</Btn>
                    <Btn color="red" size="sm" onClick={()=>excluir(ev.id)}>Remover</Btn>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))
      }
      {modal && <Modal onClose={()=>setModal(false)} width={440}>
        <div style={{fontWeight:700,fontSize:16,marginBottom:16}}>{form.id?"Editar":"Novo"} Evento</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="Titulo *"><input style={INP} value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} /></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Data *"><input type="date" style={INP} value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} /></Field>
            <Field label="Horario"><input type="time" style={INP} value={form.hora} onChange={e=>setForm(f=>({...f,hora:e.target.value}))} /></Field>
          </div>
          <Field label="Local"><input style={INP} value={form.local} onChange={e=>setForm(f=>({...f,local:e.target.value}))} /></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10,alignItems:"end"}}>
            <Field label="Ministerio"><select style={SEL} value={form.ministerio} onChange={e=>setForm(f=>({...f,ministerio:e.target.value}))}><option value="">Toda a Igreja</option>{MINISTERIOS.filter(m=>m!=="Nenhum").map(m=><option key={m}>{m}</option>)}</select></Field>
            <div><div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:0.5,marginBottom:4}}>Cor</div><div style={{display:"flex",gap:4}}>{CORES.map(c=><div key={c} onClick={()=>setForm(f=>({...f,cor:c}))} style={{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:form.cor===c?"3px solid #1e293b":"3px solid transparent"}} />)}</div></div>
          </div>
          <Field label="Descricao"><textarea style={{...INP,minHeight:58,resize:"vertical"}} value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} /></Field>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          {form.id && <Btn color="red" onClick={()=>{excluir(form.id);setModal(false);}}>Remover</Btn>}
          <Btn color="gray" onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="blue" onClick={salvar}>Salvar</Btn>
        </div>
      </Modal>}
    </div>
  );
}

// ── WHATSAPP ───────────────────────────────────────────────────────────────────