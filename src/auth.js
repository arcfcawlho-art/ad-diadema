// ═══ auth.js — PinLogin, PrimeiroCadastro, promoção de admin ═══

function PinLogin({onLogin}) {
  // phases: "lock" | "login" | "cadastro"
  const [phase, setPhase]   = useState("lock");
  const [loginNome, setLoginNome] = useState("");
  const [loginPin, setLoginPin]   = useState("");
  const [loginErr, setLoginErr]   = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady]   = useState(false);
  // Lembrar usuário
  const [nomeRemembered, setNomeRemembered] = useState("");
  const pinInputRef = useRef(null);

  // Cadastro novo (formulário de membro + PIN)
  const [cadStep, setCadStep] = useState(1); // 1=dados pessoais, 2=criar PIN
  const [cadForm, setCadForm] = useState({
    nome:"", cpf:"", nascimento:"", sexo:"", estadoCivil:"", telefone:"",
    email:"", cidade:"", cargo:"Membro", ministerio:"Nenhum",
    pin:"", confirmar:"", lgpd:false
  });
  const [cadErr, setCadErr]   = useState("");
  const [cadOk, setCadOk]     = useState(false);
  const [lockCount, setLockCount] = useState(10);

  const authRef = useRef(null);

  // ── Inicializar auth — Firebase como fonte principal ────────────────────────
  useEffect(() => {
    (async () => {
      initFirebase();

      // Tentar carregar do Firebase primeiro, fallback localStorage
      let loaded = null;
      try {
        const fb = await fbGet("church_auth");
        if (fb) {
          loaded = fb;
          // Sincronizar para localStorage como cache
          try { localStorage.setItem("church_auth", JSON.stringify(fb)); } catch(e) {}
        }
      } catch(e) {}

      if (!loaded) {
        // Fallback: localStorage
        try {
          const r = localStorage.getItem("church_auth");
          if (r) loaded = JSON.parse(r);
        } catch(e) {}
      }

      if (!loaded) {
        loaded = {admins:[SUPER_ADMIN], pendentes:[], users:[]};
      } else {
        if (!loaded.pendentes) loaded.pendentes = [];
        if (!loaded.users)     loaded.users = [];
        const temSuper = loaded.admins?.some(a => a.nivel === "super");
        if (!temSuper) {
          loaded.admins = [SUPER_ADMIN, ...(loaded.admins||[])];
        } else {
          loaded.admins = loaded.admins.map(a =>
            a.nivel === "super" ? {...a, nome:SUPER_ADMIN.nome, pin:SUPER_ADMIN.pin, cadastroCompleto:true} : a
          );
        }
        loaded.admins = loaded.admins.map(a => ({...a, cadastroCompleto:true}));
      }

      authRef.current = loaded;

      // Salvar estado inicial no Firebase + localStorage
      try { await fbSet("church_auth", loaded); } catch(e) {}
      try { localStorage.setItem("church_auth", JSON.stringify(loaded)); } catch(e) {}

      // ── Listener em tempo real: se outro dispositivo promover alguém,
      //    atualiza authRef automaticamente (sem precisar relogar)
      fbListen("church_auth", (data) => {
        if (!data) return;
        // Garantir super admin
        if (data.admins) {
          data.admins = data.admins.map(a =>
            a.nivel === "super" ? {...a, nome:SUPER_ADMIN.nome, pin:SUPER_ADMIN.pin, cadastroCompleto:true} : a
          ).map(a => ({...a, cadastroCompleto:true}));
        }
        authRef.current = data;
        try { localStorage.setItem("church_auth", JSON.stringify(data)); } catch(e) {}
        // Atualizar usuário logado se ele foi promovido
        setUser(prev => {
          if (!prev) return prev;
          const atualizado = [...(data.admins||[]), ...(data.users||[])].find(a => a.id === prev.id);
          if (atualizado && atualizado.nivel !== prev.nivel) {
            return {...prev, ...atualizado, cadastroCompleto: true};
          }
          return prev;
        });
      });

      // Carregar nome lembrado
      try {
        const saved = localStorage.getItem("church_remember_user");
        if (saved) {
          const obj = JSON.parse(saved);
          if (obj.nome) {
            setNomeRemembered(obj.nome);
            setLoginNome(obj.nome);
          }
        }
      } catch(e) {}

      setReady(true);
    })();
  }, []);

  // ── Countdown automático na tela de boas-vindas ────────────────────────────
  useEffect(() => {
    if (phase !== "lock") return;
    setLockCount(2);
    const t = setInterval(() => {
      setLockCount(c => {
        if (c <= 1) { clearInterval(t); setPhase("login"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // ── Login: busca SEMPRE do Firebase para pegar promoções em tempo real ────
  async function tryLogin() {
    const n = loginNome.trim();
    const p = loginPin.trim();
    if (!n || n.length < 2) { setLoginErr("Digite seu nome"); return; }
    if (!p || p.length < 4) { setLoginErr("Digite seu PIN (mínimo 4 dígitos)"); return; }

    setLoginLoading(true);
    setLoginErr("");

    // Sempre buscar dados frescos do Firebase (pega promoções feitas por outro device)
    try {
      const fbData = await fbGet("church_auth");
      if (fbData) {
        // Garantir super admin
        if (fbData.admins) {
          fbData.admins = fbData.admins.map(a =>
            a.nivel === "super" ? {...a, nome:SUPER_ADMIN.nome, pin:SUPER_ADMIN.pin, cadastroCompleto:true} : a
          ).map(a => ({...a, cadastroCompleto:true}));
        }
        authRef.current = fbData;
        try { localStorage.setItem("church_auth", JSON.stringify(fbData)); } catch(e) {}
      }
    } catch(e) {}

    const data = authRef.current;
    if (!data) { setLoginErr("Sistema não inicializado"); setLoginLoading(false); return; }

    const hashed = hashPin(p);

    function nomeMatch(cadastrado, digitado) {
      const a = cadastrado.toLowerCase().trim();
      const d = digitado.toLowerCase().trim();
      if (a === d) return true;
      if (a.split(" ")[0] === d.split(" ")[0]) return true;
      if (a.includes(d)) return true;
      if (d.includes(a.split(" ")[0])) return true;
      return false;
    }

    // 1. Buscar em admins (Fabricio + admins promovidos)
    const admin = (data.admins||[]).find(a => a.pin === hashed && nomeMatch(a.nome, n));

    // 2. Buscar em users (usuários comuns cadastrados)
    const user = !admin && (data.users||[]).find(u => u.pin === hashed && nomeMatch(u.nome, n));

    const encontrado = admin || user;

    if (encontrado) {
      // Lembrar o nome para próximos acessos
      try {
        localStorage.setItem("church_remember_user", JSON.stringify({nome: encontrado.nome}));
      } catch(e) {}
      setSuccess(true);
      setTimeout(() => onLogin({...encontrado, loginAt:Date.now()}), 800);
    } else {
      setLoginErr("Nome ou PIN incorretos. Verifique e tente novamente.");
    }
    setLoginLoading(false);
  }

  // ── Cadastro: salvar em users — entra direto sem aprovação ─────────────────
  async function handleCadastro() {
    setCadErr("");
    const n = cadForm.nome.trim();
    if (!n || n.length < 3)               { setCadErr("Nome completo obrigatório"); return; }
    if (!cadForm.nascimento)              { setCadErr("Data de nascimento obrigatória"); return; }
    if (!cadForm.sexo)                    { setCadErr("Selecione o sexo"); return; }
    if (!cadForm.telefone || cadForm.telefone.replace(/\D/g,"").length < 10) { setCadErr("Telefone inválido"); return; }
    if (cadForm.pin.length < 4)           { setCadErr("PIN deve ter ao menos 4 dígitos"); return; }
    if (cadForm.pin !== cadForm.confirmar){ setCadErr("PINs não coincidem"); return; }
    if (!cadForm.lgpd)                    { setCadErr("Aceite os termos para continuar"); return; }

    const data = authRef.current;
    // Checar duplicidade em admins e users
    const nLower = n.toLowerCase();
    const existeAdmin = (data.admins||[]).find(a => a.nome.toLowerCase() === nLower);
    if (existeAdmin) { setCadErr("Já existe um usuário com esse nome."); return; }
    const existeUser = (data.users||[]).find(u => u.nome.toLowerCase() === nLower);
    if (existeUser) { setCadErr("Já existe um usuário com esse nome."); return; }

    const novo = {
      id: Date.now(),
      nome: n,
      cpf: cadForm.cpf,
      nascimento: cadForm.nascimento,
      sexo: cadForm.sexo,
      estadoCivil: cadForm.estadoCivil,
      telefone: cadForm.telefone,
      email: cadForm.email,
      cidade: cadForm.cidade,
      cargo: cadForm.cargo || "Membro",
      ministerio: cadForm.ministerio || "Nenhum",
      pin: hashPin(cadForm.pin),
      nivel: "user",
      cadastroCompleto: true,
      cadastradoEm: new Date().toLocaleString("pt-BR")
    };
    data.users = [...(data.users||[]), novo];
    try { await storageSet("church_auth", JSON.stringify(data)); } catch(e) {}

    // ── Criar membro na lista da igreja ──────────────────────────────────────
    try {
      const memberId = novo.id;
      const novoMembro = {
        id: memberId,
        nome: n,
        cpf: cadForm.cpf || "",
        nascimento: cadForm.nascimento || "",
        sexo: cadForm.sexo || "",
        estadoCivil: cadForm.estadoCivil || "",
        telefone: cadForm.telefone || "",
        email: cadForm.email || "",
        endereco: "",
        cidade: cadForm.cidade || "",
        cep: "",
        cargo: cadForm.cargo || "Membro",
        ministerio: cadForm.ministerio || "Nenhum",
        dataBatismo: "",
        dataMembresia: new Date().toISOString().slice(0,10),
        conjugeNome: "",
        filhos: "",
        foto: null,
        ativo: true,
        observacoes: "",
        historicoSaida: []
      };
      // Tentar Firebase primeiro
      let membros = [];
      try {
        const fbData = await fbGet("church/members");
        if (fbData && Array.isArray(fbData)) membros = fbData;
        else {
          const local = await loadEncrypted("church_members");
          if (local) membros = local;
        }
      } catch(e2) {
        try { const local = await loadEncrypted("church_members"); if(local) membros = local; } catch(e3) {}
      }
      const listAtualizada = [...membros, novoMembro];
      await fbSet("church/members", listAtualizada);
      await saveEncrypted("church_members", listAtualizada);
    } catch(e) {}

    setCadOk(true);
  }

  // ── Background ─────────────────────────────────────────────────────────────
  const BG = (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(175deg,#f8f8f8 0%,#f0f0f0 40%,#ebebeb 70%,#f5f5f5 100%)"}} />
      <div style={{position:"absolute",top:"-20%",left:"30%",width:"60%",height:"60%",borderRadius:"50%",background:"radial-gradient(ellipse,rgba(139,50,48,0.08) 0%,transparent 70%)",filter:"blur(40px)"}} />
      {STARS.map(s => (
        <div key={s.id} style={{position:"absolute",left:s.x+"%",top:s.y+"%",width:s.s,height:s.s,borderRadius:"50%",
          background:"#8b3230",opacity:s.op*0.3,animation:`starTwinkle ${s.dur}s ${s.delay}s ease-in-out infinite`}} />
      ))}
    </div>
  );

  if (!ready) return (
    <div style={{minHeight:"100vh",background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <style>{LOGIN_CSS}</style>{BG}
      <div style={{width:36,height:36,borderRadius:"50%",border:"2.5px solid #ddd",borderTopColor:"#8b3230",animation:"spinLoader 0.8s linear infinite"}} />
    </div>
  );

  if (phase === "lock") {
    const LOCK_SECS = 2;
    const pct = ((LOCK_SECS - lockCount) / LOCK_SECS) * 100;
    return (
      <div onClick={()=>setPhase("login")} style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",fontFamily:"Inter,system-ui,sans-serif",position:"relative",overflow:"hidden",cursor:"pointer"}}>
        <style>{LOGIN_CSS}</style>{BG}
        {/* Barra de progresso no topo */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"rgba(139,50,48,0.1)",zIndex:10}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#8b3230,#c9a84c)",width:pct+"%",transition:"width 1s linear"}}/>
        </div>
        {/* Logo centralizado */}
        <div style={{textAlign:"center",animation:"fadeUp 0.7s 0.1s ease both",zIndex:1}}>
          <div style={{width:150,height:150,borderRadius:38,background:"#fff",border:"2px solid rgba(139,50,48,0.15)",
            boxShadow:"0 8px 40px rgba(139,50,48,0.18)",display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 20px",animation:"glowPulse 3s ease-in-out infinite"}}>
            <img src={LOGO_B64} style={{width:116,height:116,objectFit:"contain"}} alt="Logo"/>
          </div>
          <div style={{color:"#8b3230",fontWeight:700,fontSize:18,letterSpacing:0.5}}>Assembleia de Deus</div>
          <div style={{color:"#aaa",fontSize:12,marginTop:5,letterSpacing:3,textTransform:"uppercase"}}>Diadema</div>
        </div>
        {/* Bem-vindo */}
        <div style={{animation:"fadeUp 0.7s 0.4s ease both",zIndex:1,textAlign:"center",marginTop:32}}>
          <div style={{color:"#8b3230",fontSize:22,fontWeight:300,letterSpacing:3}}>Bem-vindo</div>
        </div>
      </div>
    );
  }

  // ── TELA DE CADASTRO ──────────────────────────────────────────────────────────
  if (phase === "cadastro") return (
    <div style={{minHeight:"100vh",background:"#f5f5f5",fontFamily:"Inter,system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{LOGIN_CSS}</style>{BG}
      <div style={{maxWidth:440,margin:"0 auto",padding:"24px 20px 60px",position:"relative",zIndex:1}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <button onClick={()=>{setPhase("login");setCadErr("");setCadOk(false);setCadStep(1);}} style={{
            background:"#ececec",border:"1px solid #ddd",borderRadius:20,color:"#888",padding:"6px 14px",
            fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Voltar
          </button>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:"#1a1a1a"}}>Solicitar Acesso</div>
            <div style={{fontSize:11,color:"#888"}}>Passo {cadStep} de 2</div>
          </div>
        </div>

        {cadOk ? (
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:14,padding:"28px 20px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontWeight:700,fontSize:16,color:"#15803d",marginBottom:8}}>Solicitação enviada!</div>
            <div style={{fontSize:13,color:"#166534",lineHeight:1.7}}>
              Cadastro realizado com sucesso!<br/>
              Agora entre com seu nome e PIN.
            </div>
            <button onClick={()=>{setPhase("login");setCadOk(false);setCadStep(1);setCadForm({nome:"",cpf:"",nascimento:"",sexo:"",estadoCivil:"",telefone:"",email:"",cidade:"",cargo:"Membro",ministerio:"Nenhum",pin:"",confirmar:"",lgpd:false});}} style={{
              marginTop:20,padding:"11px 28px",borderRadius:20,border:"none",
              background:"linear-gradient(135deg,#742a28,#5c1a18)",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer"
            }}>Ir para o login →</button>
          </div>
        ) : cadStep === 1 ? (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff",borderRadius:14,padding:"18px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:14,paddingBottom:10,borderBottom:"1px solid #f1f5f9"}}>📋 Dados Pessoais</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {[
                  {label:"Nome completo *", key:"nome", type:"text", placeholder:"Seu nome completo"},
                  {label:"CPF", key:"cpf", type:"text", placeholder:"000.000.000-00"},
                  {label:"Data de nascimento *", key:"nascimento", type:"date"},
                  {label:"Telefone *", key:"telefone", type:"tel", placeholder:"(11) 99999-9999"},
                  {label:"E-mail", key:"email", type:"email", placeholder:"seu@email.com"},
                  {label:"Cidade", key:"cidade", type:"text", placeholder:"Cidade"},
                ].map(f => (
                  <div key={f.key}>
                    <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder||""}
                      style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc"}}
                      value={cadForm[f.key]}
                      onChange={e=>{
                        let v = e.target.value;
                        if(f.key==="cpf") v=fCPF(v);
                        if(f.key==="telefone") v=fTel(v);
                        setCadForm(cf=>({...cf,[f.key]:v}));setCadErr("");
                      }}
                    />
                  </div>
                ))}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Sexo *</label>
                    <select style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",cursor:"pointer"}}
                      value={cadForm.sexo} onChange={e=>{setCadForm(cf=>({...cf,sexo:e.target.value}));setCadErr("");}}>
                      <option value="">Selecione</option>
                      <option>Masculino</option><option>Feminino</option>
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Estado Civil</label>
                    <select style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",cursor:"pointer"}}
                      value={cadForm.estadoCivil} onChange={e=>setCadForm(cf=>({...cf,estadoCivil:e.target.value}))}>
                      <option value="">Selecione</option>
                      <option>Solteiro(a)</option><option>Casado(a)</option><option>Divorciado(a)</option><option>Viúvo(a)</option>
                    </select>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Cargo</label>
                    <select style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",cursor:"pointer"}}
                      value={cadForm.cargo} onChange={e=>setCadForm(cf=>({...cf,cargo:e.target.value}))}>
                      {CARGOS.map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Ministério</label>
                    <select style={{width:"100%",padding:"10px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,outline:"none",background:"#f8fafc",cursor:"pointer"}}
                      value={cadForm.ministerio} onChange={e=>setCadForm(cf=>({...cf,ministerio:e.target.value}))}>
                      {MINISTERIOS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            {cadErr && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#dc2626"}}>❌ {cadErr}</div>}
            <button onClick={()=>{
              const n=cadForm.nome.trim();
              if(!n||n.length<3){setCadErr("Nome completo obrigatório");return;}
              if(!cadForm.nascimento){setCadErr("Data de nascimento obrigatória");return;}
              if(!cadForm.sexo){setCadErr("Selecione o sexo");return;}
              if(!cadForm.telefone||cadForm.telefone.replace(/\D/g,"").length<10){setCadErr("Telefone inválido");return;}
              setCadErr("");setCadStep(2);
            }} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:"linear-gradient(135deg,#742a28,#5c1a18)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
              boxShadow:"0 4px 16px rgba(116,42,40,0.3)"}}>Próximo →</button>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fff",borderRadius:14,padding:"18px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.06)"}}>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",marginBottom:14,paddingBottom:10,borderBottom:"1px solid #f1f5f9"}}>🔐 Criar PIN de Acesso</div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Criar PIN (4–6 dígitos) *</label>
                  <input type="password" inputMode="numeric" maxLength={6}
                    style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:18,outline:"none",background:"#f8fafc",letterSpacing:8,textAlign:"center"}}
                    value={cadForm.pin} onChange={e=>setCadForm(cf=>({...cf,pin:e.target.value.replace(/\D/g,"")}))}
                    placeholder="• • • •" />
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:600,color:"#64748b",marginBottom:4,display:"block",textTransform:"uppercase",letterSpacing:0.3}}>Confirmar PIN *</label>
                  <input type="password" inputMode="numeric" maxLength={6}
                    style={{width:"100%",padding:"12px 14px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:18,outline:"none",background:"#f8fafc",letterSpacing:8,textAlign:"center"}}
                    value={cadForm.confirmar} onChange={e=>setCadForm(cf=>({...cf,confirmar:e.target.value.replace(/\D/g,"")}))}
                    placeholder="• • • •" />
                </div>
                <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"12px",borderRadius:8,background:"#f8fafc",border:"1px solid #e2e8f0"}}>
                  <input type="checkbox" checked={cadForm.lgpd} onChange={e=>setCadForm(cf=>({...cf,lgpd:e.target.checked}))}
                    style={{width:16,height:16,marginTop:2,accentColor:"#742a28",flexShrink:0}} />
                  <span style={{fontSize:11,color:"#475569",lineHeight:1.6}}>
                    Concordo com o uso dos meus dados pessoais pela Igreja conforme a <strong>LGPD</strong> (Lei 13.709/2018). As informações serão usadas exclusivamente para gestão eclesiástica.
                  </span>
                </label>
              </div>
            </div>
            {cadErr && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#dc2626"}}>❌ {cadErr}</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setCadStep(1);setCadErr("");}} style={{flex:1,padding:"13px",borderRadius:12,border:"1px solid #e2e8f0",background:"#f8fafc",color:"#64748b",fontWeight:600,fontSize:13,cursor:"pointer"}}>← Voltar</button>
              <button onClick={handleCadastro} style={{flex:2,padding:"13px",borderRadius:12,border:"none",
                background:"linear-gradient(135deg,#742a28,#5c1a18)",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
                boxShadow:"0 4px 16px rgba(116,42,40,0.3)"}}>Solicitar Acesso</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ── TELA DE LOGIN (nome + PIN em box único) ──────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#f5f5f5",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",padding:"32px 24px",fontFamily:"Inter,system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <style>{LOGIN_CSS}</style>{BG}

      <button onClick={()=>setPhase("lock")} style={{
        position:"absolute",top:24,left:20,background:"#ececec",border:"1px solid #ddd",borderRadius:20,
        color:"#888",padding:"6px 14px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,zIndex:10
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        Voltar
      </button>

      {success ? (
        <div style={{textAlign:"center",animation:"successPop 0.5s ease both",zIndex:1}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#059669,#10b981)",
            display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",
            boxShadow:"0 0 0 12px rgba(5,150,105,0.15),0 0 50px rgba(16,185,129,0.4)"}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{color:"#1a1a1a",fontWeight:700,fontSize:17}}>Bem-vindo!</div>
          <div style={{color:"#888",fontSize:13,marginTop:5}}>Acessando o sistema...</div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:360,zIndex:1,animation:"slideUp 0.35s ease both"}}>
          {/* Logo */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <div style={{width:72,height:72,borderRadius:20,background:"#fff",border:"2px solid rgba(139,50,48,0.12)",
              boxShadow:"0 4px 20px rgba(139,50,48,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",animation:"glowPulse 3s ease-in-out infinite"}}>
              <img src={LOGO_B64} style={{width:54,height:54,objectFit:"contain"}} alt="Logo"/>
            </div>
            <div style={{color:"#1a1a1a",fontWeight:700,fontSize:17}}>Bem-vindo</div>
            <div style={{color:"#888",fontSize:12,marginTop:3}}>Entre com suas credenciais</div>
          </div>

          {/* BOX de login */}
          <div style={{background:"#fff",borderRadius:16,padding:"20px 18px",boxShadow:"0 4px 24px rgba(0,0,0,0.08)",border:"1px solid rgba(139,50,48,0.08)",marginBottom:10}}>

            {/* Se tem nome lembrado, mostrar chip com opção de trocar */}
            {nomeRemembered ? (
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Entrando como</label>
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#f5f3ff",borderRadius:10,border:"1.5px solid #ddd6fe"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#742a28,#8b3230)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:15,flexShrink:0}}>
                    {nomeRemembered[0].toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14,color:"#1a1a1a"}}>{nomeRemembered}</div>
                    <div style={{fontSize:11,color:"#7c3aed"}}>Digite seu PIN para entrar</div>
                  </div>
                  <button onClick={()=>{
                    setNomeRemembered("");
                    setLoginNome("");
                    try{localStorage.removeItem("church_remember_user");}catch(e){}
                  }} style={{background:"#ede9fe",border:"none",borderRadius:8,padding:"5px 10px",fontSize:11,color:"#7c3aed",cursor:"pointer",fontWeight:600,flexShrink:0}}>
                    Trocar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{marginBottom:14}}>
                <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>Nome</label>
                <input
                  autoFocus
                  style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,
                    outline:"none",background:"#f8fafc",color:"#1a1a1a",transition:"border 0.2s",boxSizing:"border-box"}}
                  value={loginNome}
                  onChange={e=>{setLoginNome(e.target.value);setLoginErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&pinInputRef.current?.focus()}
                  placeholder="Seu nome completo"
                  onFocus={e=>e.target.style.borderColor="#8b3230"}
                  onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                />
              </div>
            )}

            <div style={{marginBottom:8}}>
              <label style={{fontSize:11,fontWeight:700,color:"#64748b",display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:0.4}}>PIN</label>
              <input
                ref={pinInputRef}
                autoFocus={!!nomeRemembered}
                id="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                style={{width:"100%",padding:"12px 14px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:18,
                  outline:"none",background:"#f8fafc",color:"#1a1a1a",letterSpacing:10,textAlign:"center",transition:"border 0.2s",boxSizing:"border-box"}}
                value={loginPin}
                onChange={e=>{setLoginPin(e.target.value.replace(/\D/g,""));setLoginErr("");}}
                onKeyDown={e=>e.key==="Enter"&&tryLogin()}
                placeholder="• • • •"
                onFocus={e=>e.target.style.borderColor="#8b3230"}
                onBlur={e=>e.target.style.borderColor="#e2e8f0"}
              />
            </div>
            {loginErr && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"9px 12px",fontSize:12,color:"#dc2626",marginBottom:4}}>❌ {loginErr}</div>}
          </div>

          <button onClick={tryLogin} disabled={loginLoading} style={{
            width:"100%",padding:"15px",borderRadius:12,border:"none",
            background:"linear-gradient(135deg,#742a28,#5c1a18)",color:"#fff",fontSize:15,fontWeight:700,
            cursor:"pointer",boxShadow:"0 4px 20px rgba(116,42,40,0.4)",letterSpacing:0.3,marginBottom:14,
            opacity:loginLoading?0.7:1
          }}>
            {loginLoading
              ? <span style={{display:"inline-flex",alignItems:"center",gap:8}}>
                  <span style={{width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spinLoader 0.7s linear infinite",display:"inline-block"}}/>
                  Verificando...
                </span>
              : "Entrar"
            }
          </button>

          {/* Link cadastro */}
          <div style={{textAlign:"center"}}>
            <button onClick={()=>{setPhase("cadastro");setLoginErr("");setCadStep(1);}} style={{
              background:"transparent",border:"none",color:"#742a28",fontSize:13,fontWeight:600,
              cursor:"pointer",textDecoration:"underline",padding:"4px 8px"
            }}>Primeiro acesso? Cadastre-se</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimeiroCadastro({ user, onComplete, onLogout, members, setMembers, save }) {
  const [modo, setModo] = useState("jatem"); // "jatem" | "novo"
  const [form, setForm] = useState({
    nome: user.nome !== "Administrador" ? user.nome : "",
    telefone: "", nascimento: "", foto: null,
    endereco: "", numero: "", bairro: "", cidade: "", cep: "",
    cargo: "Membro", ministerio: "Nenhum",
  });
  const [jaForm, setJaForm]     = useState({ nome: "" });
  const [jaErr, setJaErr]       = useState("");
  const [jaOk, setJaOk]         = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [novoPIN, setNovoPIN]   = useState({ pin:"", confirmar:"" });
  const [jaChecking, setJaChecking] = useState(false);
  const [errors, setErrors]     = useState({});
  const [showLeave, setShowLeave] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [welcome, setWelcome]   = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeFoto, setWelcomeFoto] = useState(null);
  const hf = (k,v) => { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:undefined})); };

  useEffect(() => {
    const handler = e => { e.preventDefault(); e.returnValue = ""; setShowLeave(true); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── VERIFICAR "JÁ SOU CADASTRADO" ──────────────────────────────────────────
  async function verificarJaCadastrado() {
    setJaErr("");
    const nomeBusca = jaForm.nome.trim().toLowerCase();
    if (!nomeBusca) { setJaErr("Informe seu nome completo"); return; }
    setJaChecking(true);

    try {
      // Você já autenticou com seu PIN na tela de acesso.
      // Aqui só verificamos se você está na lista de membros.
      let membrosAtual = members;
      if (!membrosAtual || membrosAtual.length === 0) {
        try {
          const fbData = await fbGet("church/members");
          if (fbData && Array.isArray(fbData)) membrosAtual = fbData;
          else { const local = await loadEncrypted("church_members"); membrosAtual = local || []; }
        } catch(e) { membrosAtual = []; }
      }

      const palavras = nomeBusca.split(" ").filter(p => p.length > 1);
      const membro = membrosAtual.find(m =>
        m.ativo && m.nome &&
        palavras.every(p => m.nome.toLowerCase().includes(p))
      );

      if (!membro) {
        setJaErr(`Nenhum membro encontrado com o nome "${jaForm.nome.trim()}". Verifique se digitou corretamente ou use "Cadastre-se".`);
        setJaChecking(false); return;
      }

      // Encontrado → marcar como completo e entrar
      setJaOk(true);
      setWelcomeName(membro.nome);
      setWelcomeFoto(membro.foto || null);
      await markCadastroCompleto(user.id);
      setWelcome(true);
      setTimeout(() => onComplete({...user, cadastroCompleto:true}), 2600);
    } catch(e) {
      setJaErr("Erro ao verificar. Tente novamente.");
    }
    setJaChecking(false);
  }

  // ── NOVO CADASTRO ───────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.nome.trim())                e.nome       = "Nome é obrigatório";
    if (!form.telefone.replace(/\D/g,"")) e.telefone   = "Telefone é obrigatório";
    if (!form.nascimento)                 e.nascimento = "Data de nascimento é obrigatória";
    if (!form.foto)                       e.foto       = "Foto é obrigatória";
    if (!form.endereco.trim())            e.endereco   = "Endereço é obrigatório";
    if (!form.cidade.trim())              e.cidade     = "Cidade é obrigatória";
    if (novoPIN.pin.length >= 4) {
      if (novoPIN.pin !== novoPIN.confirmar) e.confirmarPIN = "Os PINs não coincidem";
    } else if (novoPIN.pin.length > 0) {
      e.pin = "PIN deve ter pelo menos 4 dígitos";
    }
    return e;
  }

  async function handleFoto(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => { const resized = await resizeFoto(ev.target.result); hf("foto", resized); };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!aceitouTermos) { setErrors(e=>({...e,termos:"Você precisa aceitar os termos para continuar"})); return; }
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      const enderecoFull = [form.endereco.trim(), form.numero.trim(), form.bairro.trim()].filter(Boolean).join(", ");
      const newMember = { ...EMPTY_MEMBER, id: Date.now(),
        nome: form.nome.trim(), telefone: form.telefone, nascimento: form.nascimento,
        foto: form.foto, endereco: enderecoFull, cidade: form.cidade.trim(),
        cep: form.cep, cargo: form.cargo, ministerio: form.ministerio,
        ativo: true, dataMembresia: hoje(), _adminId: user.id };
      const updated = [...members, newMember];
      setMembers(updated); await save(updated);
      await markCadastroCompleto(user.id);
      // Se o usuário definiu um PIN novo, salvar
      if (novoPIN.pin.length >= 4 && novoPIN.pin === novoPIN.confirmar) {
        try {
          const rp = await storageGet("church_auth");
          if (rp?.value) {
            const authP = JSON.parse(rp.value);
            authP.admins = authP.admins.map(a =>
              a.id === user.id ? {...a, pin: hashPin(novoPIN.pin), pinTrocado: true} : a
            );
            await storageSet("church_auth", JSON.stringify(authP));
          }
        } catch(ep) {}
      }
      setWelcomeName(newMember.nome);
      setWelcomeFoto(newMember.foto);
      setWelcome(true);
      setTimeout(() => onComplete({...user, cadastroCompleto:true}), 2800);
    } catch(e) { setSaving(false); }
  }

  // ── TELA BEM-VINDO ──────────────────────────────────────────────────────────
  if (welcome) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#8b3230,#5c1a18)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32}}>
      <style>{`@keyframes successPop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}} @keyframes spinLoader{to{transform:rotate(360deg)}}`}</style>
      <div style={{textAlign:"center",animation:"successPop 0.5s ease both"}}>
        <div style={{width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.15)",border:"3px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",boxShadow:"0 0 40px rgba(255,255,255,0.2)"}}>
          {welcomeFoto ? <img src={welcomeFoto} style={{width:94,height:94,borderRadius:"50%",objectFit:"cover"}} alt="foto"/> : <span style={{fontSize:40}}>✝</span>}
        </div>
        <div style={{color:"#fff",fontWeight:800,fontSize:26,marginBottom:8}}>Bem-vindo(a)!</div>
        <div style={{color:"rgba(255,255,255,0.8)",fontSize:16,marginBottom:6}}>{welcomeName}</div>
        <div style={{color:"rgba(255,255,255,0.55)",fontSize:13}}>Identidade verificada com sucesso.</div>
        <div style={{color:"rgba(255,255,255,0.4)",fontSize:12,marginTop:20}}>Entrando no sistema...</div>
        <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(255,255,255,0.2)",borderTopColor:"rgba(255,255,255,0.8)",animation:"spinLoader 0.9s linear infinite",margin:"14px auto 0"}}/>
      </div>
    </div>
  );

  const ERR = {fontSize:11,color:"#dc2626",marginTop:3};
  const haErr = k => errors[k] ? {borderColor:"#fca5a5"} : {};

  return (
    <div style={{minHeight:"100vh",background:"#f1f5f9",fontFamily:"system-ui,sans-serif"}}>
      <style>{`@keyframes spinLoader{to{transform:rotate(360deg)}} @keyframes successPop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#742a28,#5c1a18)",padding:"18px 20px",display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:50,boxShadow:"0 2px 12px rgba(0,0,0,0.2)"}}>
        <img src={LOGO_B64} style={{width:38,height:38,objectFit:"contain",borderRadius:8,background:"rgba(255,255,255,0.1)",padding:3}} alt="Logo"/>
        <div>
          <div style={{color:"#fff",fontWeight:700,fontSize:15}}>Verificação de Identidade</div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:11}}>Obrigatório para acessar o sistema</div>
        </div>
        <div style={{marginLeft:"auto",background:"rgba(255,255,255,0.12)",borderRadius:20,padding:"4px 12px",color:"rgba(255,255,255,0.8)",fontSize:11,fontWeight:600}}>1ª entrada</div>
      </div>

      {/* Abas */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",display:"flex"}}>
        <button onClick={()=>{setModo("jatem");setJaErr("");setErrors({});}} style={{
          flex:1,padding:"14px 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
          background:"transparent",borderBottom:modo==="jatem"?"3px solid #742a28":"3px solid transparent",
          color:modo==="jatem"?"#742a28":"#64748b",transition:"all 0.15s"
        }}>🔐 Já sou cadastrado</button>
        <button onClick={()=>{setModo("novo");setJaErr("");setErrors({});}} style={{
          flex:1,padding:"14px 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:13,
          background:"transparent",borderBottom:modo==="novo"?"3px solid #742a28":"3px solid transparent",
          color:modo==="novo"?"#742a28":"#64748b",transition:"all 0.15s"
        }}>📝 Cadastre-se</button>
      </div>

      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 16px 40px"}}>

        {/* ── ABA: JÁ SOU CADASTRADO ── */}
        {modo === "jatem" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"14px 16px",fontSize:13,color:"#1d4ed8",lineHeight:1.6}}>
              ✅ <b>Seu acesso foi verificado pelo PIN.</b><br/>
              Agora confirme seu nome completo como está na lista de membros para liberar o sistema.
            </div>

            <Field label="Seu nome completo (como está no cadastro)">
              <input style={INP} value={jaForm.nome} onChange={e=>{setJaForm(f=>({...f,nome:e.target.value}));setJaErr("");}}
                placeholder="Ex: João da Silva"
                onKeyDown={e=>e.key==="Enter"&&verificarJaCadastrado()} />
            </Field>

            {jaErr && (
              <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#dc2626",lineHeight:1.5}}>
                ❌ {jaErr}
              </div>
            )}

            <button onClick={verificarJaCadastrado} disabled={jaChecking || jaOk} style={{
              width:"100%",padding:"14px",borderRadius:12,border:"none",
              background:jaChecking||jaOk?"#94a3b8":"linear-gradient(135deg,#059669,#047857)",
              color:"#fff",fontWeight:700,fontSize:14,cursor:jaChecking||jaOk?"not-allowed":"pointer",
              boxShadow:"0 4px 16px rgba(5,150,105,0.3)",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8
            }}>
              {jaChecking
                ? <><span style={{width:16,height:16,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spinLoader 0.8s linear infinite",display:"inline-block"}}/> Verificando...</>
                : jaOk ? "✅ Verificado!" : "🔍 Verificar e Entrar"
              }
            </button>

            <button onClick={()=>setShowLeave(true)} style={{
              width:"100%",padding:"10px",borderRadius:10,border:"1px solid #e2e8f0",
              background:"#f8fafc",color:"#64748b",cursor:"pointer",fontSize:12,fontWeight:500
            }}>Sair do sistema</button>
          </div>
        )}

        {/* ── ABA: NOVO CADASTRO ── */}
        {modo === "novo" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{background:"#fef3c7",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e"}}>
              ⚠️ Preencha todos os campos obrigatórios (<b>*</b>) para acessar o sistema.
            </div>

            {/* Foto */}
            <div style={{textAlign:"center"}}>
              <div style={{position:"relative",display:"inline-block"}}>
                <div style={{width:90,height:90,borderRadius:"50%",overflow:"hidden",border:errors.foto?"3px solid #fca5a5":"3px solid #e2e8f0",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                  onClick={()=>document.getElementById("foto-upload").click()}>
                  {form.foto
                    ? <img src={form.foto} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="foto"/>
                    : <div style={{textAlign:"center",color:"#94a3b8"}}><div style={{fontSize:28}}>📷</div><div style={{fontSize:10,marginTop:2}}>Foto *</div></div>}
                </div>
                <input id="foto-upload" type="file" accept="image/*" style={{display:"none"}} onChange={handleFoto}/>
                <div style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:"#742a28",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"2px solid #fff"}}
                  onClick={()=>document.getElementById("foto-upload").click()}>
                  <span style={{color:"#fff",fontSize:12}}>+</span>
                </div>
              </div>
              {errors.foto && <div style={{...ERR,textAlign:"center"}}>{errors.foto}</div>}
            </div>

            <Field label="Nome completo *">
              <input style={{...INP,...haErr("nome")}} value={form.nome} onChange={e=>hf("nome",e.target.value)} placeholder="Seu nome completo"/>
              {errors.nome && <div style={ERR}>{errors.nome}</div>}
            </Field>
            <Field label="Telefone / WhatsApp *">
              <input style={{...INP,...haErr("telefone")}} value={form.telefone} onChange={e=>hf("telefone",fTel(e.target.value))} placeholder="(11) 99999-9999" inputMode="tel"/>
              {errors.telefone && <div style={ERR}>{errors.telefone}</div>}
            </Field>
            <Field label="Data de Nascimento *">
              <input type="date" style={{...INP,...haErr("nascimento")}} value={form.nascimento} onChange={e=>hf("nascimento",e.target.value)}/>
              {errors.nascimento && <div style={ERR}>{errors.nascimento}</div>}
            </Field>
            <Field label="Endereço (Rua/Av.) *">
              <input style={{...INP,...haErr("endereco")}} value={form.endereco} onChange={e=>hf("endereco",e.target.value)} placeholder="Rua ou Avenida"/>
              {errors.endereco && <div style={ERR}>{errors.endereco}</div>}
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Número"><input style={INP} value={form.numero} onChange={e=>hf("numero",e.target.value)} placeholder="123"/></Field>
              <Field label="Bairro"><input style={INP} value={form.bairro} onChange={e=>hf("bairro",e.target.value)} placeholder="Bairro"/></Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:10}}>
              <Field label="Cidade *">
                <input style={{...INP,...haErr("cidade")}} value={form.cidade} onChange={e=>hf("cidade",e.target.value)} placeholder="Diadema"/>
                {errors.cidade && <div style={ERR}>{errors.cidade}</div>}
              </Field>
              <Field label="CEP">
                <input style={{...INP,width:110}} value={form.cep} onChange={e=>hf("cep",fCEP(e.target.value))} placeholder="09000-000" inputMode="numeric"/>
              </Field>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Cargo *">
                <select style={SEL} value={form.cargo} onChange={e=>hf("cargo",e.target.value)}>
                  {CARGOS.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Ministério *">
                <select style={SEL} value={form.ministerio} onChange={e=>hf("ministerio",e.target.value)}>
                  {MINISTERIOS.map(m=><option key={m}>{m}</option>)}
                </select>
              </Field>
            </div>

            {/* ── Definir PIN ── */}
            

            {/* Checkbox de licença — desmarcado por padrão */}
            <div style={{
              background: errors.termos ? "#fef2f2" : "#f8fafc",
              border: errors.termos ? "1px solid #fca5a5" : "1px solid #e2e8f0",
              borderRadius:10, padding:"12px 14px",
            }}>
              <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
                <div onClick={()=>{setAceitouTermos(v=>!v);setErrors(e=>({...e,termos:undefined}));}} style={{
                  width:22,height:22,borderRadius:6,flexShrink:0,marginTop:1,
                  border: aceitouTermos ? "none" : "2px solid #cbd5e1",
                  background: aceitouTermos ? "linear-gradient(135deg,#742a28,#5c1a18)" : "#fff",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  transition:"all 0.15s",cursor:"pointer",
                  boxShadow: aceitouTermos ? "0 2px 8px rgba(116,42,40,0.3)" : "none",
                }}>
                  {aceitouTermos && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{fontSize:12,color:"#475569",lineHeight:1.6}}>
                  <span style={{fontWeight:700,color:"#1e293b"}}>Li e aceito os termos de uso</span><br/>
                  Confirmo que os dados informados são verdadeiros e autorizo o armazenamento conforme a <span style={{color:"#742a28",fontWeight:600}}>LGPD</span>.
                </div>
              </label>
              {errors.termos && <div style={{fontSize:11,color:"#dc2626",marginTop:8,paddingLeft:34}}>⚠️ {errors.termos}</div>}
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{
              width:"100%",padding:"15px",borderRadius:12,border:"none",
              background:saving?"#94a3b8":"linear-gradient(135deg,#742a28,#5c1a18)",
              color:"#fff",fontWeight:700,fontSize:15,cursor:saving?"not-allowed":"pointer",
              marginTop:4,boxShadow:"0 4px 16px rgba(116,42,40,0.35)",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8
            }}>
              {saving
                ? <><span style={{width:18,height:18,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spinLoader 0.8s linear infinite",display:"inline-block"}}/> Salvando...</>
                : <>✅ Concluir Cadastro e Entrar</>}
            </button>
            <button onClick={()=>setShowLeave(true)} style={{
              width:"100%",padding:"10px",borderRadius:10,border:"1px solid #e2e8f0",
              background:"#f8fafc",color:"#64748b",cursor:"pointer",fontSize:12,fontWeight:500
            }}>Sair do sistema</button>
          </div>
        )}
      </div>

      {/* Modal de aviso ao sair */}
      {showLeave && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div style={{background:"#fff",borderRadius:16,padding:28,maxWidth:360,width:"100%",textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:44,marginBottom:12}}>🚫</div>
            <div style={{fontWeight:800,fontSize:17,color:"#1e293b",marginBottom:8}}>Verificação incompleta!</div>
            <div style={{color:"#475569",fontSize:13,lineHeight:1.6,marginBottom:22}}>
              Você ainda não verificou sua identidade.<br/>
              <b>Sair agora encerrará sua sessão.</b>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button onClick={()=>setShowLeave(false)} style={{
                padding:"12px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#742a28,#5c1a18)",
                color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer"
              }}>← Continuar verificação</button>
              <button onClick={()=>{ setShowLeave(false); onLogout(); }} style={{
                padding:"10px",borderRadius:10,border:"1px solid #fca5a5",
                background:"#fef2f2",color:"#dc2626",fontWeight:600,fontSize:13,cursor:"pointer"
              }}>Sair e encerrar sessão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP ────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// HOME DASHBOARD — v4 JSX direto, ícones soltos grandes
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// HOME DASHBOARD — v3 ícones SVG contorno estilo app moderno
// ═══════════════════════════════════════════════════════════════════════════════

function HomeCard({def:c, onClick, stat}) {
  const [pressed, setPressed] = React.useState(false);
  const Ico = c.Icon;
  return (
    <button onClick={onClick}
      onTouchStart={()=>setPressed(true)} onTouchEnd={()=>setPressed(false)}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} onMouseLeave={()=>setPressed(false)}
      style={{
        background: pressed ? c.light : "#fff",
        border: "1.5px solid " + (pressed ? c.color+"33" : "#f1f5f9"),
        borderRadius:20, padding:"20px 12px 18px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:12,
        cursor:"pointer", outline:"none", textAlign:"center",
        transform: pressed ? "scale(0.96)" : "scale(1)",
        transition:"all 0.15s ease",
        boxShadow: pressed ? "none" : "0 1px 8px rgba(0,0,0,0.06)",
        WebkitTapHighlightColor:"transparent",
        width:"100%",
      }}>
      <div style={{width:60,height:60,borderRadius:18,background:c.light,
        display:"flex",alignItems:"center",justifyContent:"center",color:c.color,flexShrink:0}}>
        <Ico/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
        <div style={{fontWeight:700,fontSize:13.5,color:"#0f172a",lineHeight:1.3}}>{c.label}</div>
        {stat && <div style={{fontSize:11,color:"#94a3b8"}}>{stat}</div>}
      </div>
    </button>
  );
}

const IcoMembros    = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IcoInfantil   = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4"/><circle cx="7" cy="13" r="2"/><circle cx="17" cy="13" r="2"/></svg>;
const IcoAniv       = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21H4v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8z"/><path d="M4 17s1-1 2-1 3 2 4 2 3-2 4-2 2 1 2 1"/><line x1="2" y1="21" x2="22" y2="21"/><path d="M7 11V8"/><path d="M12 11V8"/><path d="M17 11V8"/><path d="M7 5.5a1.5 1.5 0 1 1 0-3c0 1.5-1.5 2.5-1.5 3z"/><path d="M12 5.5a1.5 1.5 0 1 1 0-3c0 1.5-1.5 2.5-1.5 3z"/><path d="M17 5.5a1.5 1.5 0 1 1 0-3c0 1.5-1.5 2.5-1.5 3z"/></svg>;
const IcoAgenda     = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/></svg>;
const IcoOracao     = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4"/><path d="M9 3h6a2 2 0 0 1 0 4H9a2 2 0 0 1 0-4z"/><path d="M9 14l2 2 4-4"/></svg>;
const IcoWhats      = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>;
const IcoSecretaria = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>;
const IcoAdmin      = () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>;

const CARD_DEFS = [
  {key:"membros",     label:"Membros",          Icon:IcoMembros,    color:"#2563eb", light:"#dbeafe", nav:"membros"},
  {key:"infantil",    label:"Infantil",           Icon:IcoInfantil,   color:"#0891b2", light:"#cffafe", nav:"infantil"},
  {key:"aniversario", label:"Aniversariantes",    Icon:IcoAniv,       color:"#d97706", light:"#fef3c7", nav:"relatorio"},
  {key:"agenda",      label:"Agenda",             Icon:IcoAgenda,     color:"#059669", light:"#d1fae5", nav:"agenda"},
  {key:"oracao",      label:"Pedido de Oração",   Icon:IcoOracao,     color:"#7c3aed", light:"#ede9fe", nav:"oracao"},
  {key:"whatsapp",    label:"WhatsApp",           Icon:IcoWhats,      color:"#16a34a", light:"#dcfce7", nav:"whatsapp",   adminOnly:true},
  {key:"secretaria",  label:"Secretaria",         Icon:IcoSecretaria, color:"#8b3230", light:"#fee2e2", nav:"secretaria", adminOnly:true},
  {key:"admin",       label:"Admin",              Icon:IcoAdmin,      color:"#475569", light:"#f1f5f9", nav:"admin",       adminOnly:true},
];
