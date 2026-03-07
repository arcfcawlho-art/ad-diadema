
const usuarios={

login(){

const nome=document.getElementById("loginNome").value
const pin=document.getElementById("loginPin").value

const lista=storage.get("usuarios")

const user=lista.find(u=>u.nome===nome && u.pin===pin)

if(!user){
alert("Usuário não encontrado")
return
}

localStorage.setItem("usuarioLogado",JSON.stringify(user))

document.getElementById("login").style.display="none"
ui.show("membros")

if(user.admin){
document.getElementById("adminBtn").style.display="inline-block"
}

},

salvar(){

const nome=document.getElementById("nome").value
const cargo=document.getElementById("cargo").value
const congregacao=document.getElementById("congregacao").value
const endereco=document.getElementById("endereco").value
const whatsapp=document.getElementById("whatsapp").value
const familia=document.getElementById("familia").value
const foto=document.getElementById("foto").files[0]

const reader=new FileReader()

reader.onload=function(){

const membro={
id:Date.now(),
nome,
cargo,
congregacao,
endereco,
whatsapp,
familia,
foto:reader.result
}

storage.add("membros",membro)

usuarios.listar()

}

if(foto)reader.readAsDataURL(foto)

},

listar(){

let membros=storage.get("membros")

membros.sort((a,b)=>a.nome.localeCompare(b.nome))

const ul=document.getElementById("listaMembros")
ul.innerHTML=""

membros.forEach(m=>{

const li=document.createElement("li")

li.innerHTML=`
<img src="${m.foto}" height="40">
<b>${m.nome}</b> - ${m.cargo}<br>
${m.congregacao}
`

ul.appendChild(li)

})

}

}
