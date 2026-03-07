
const criancas={

salvar(){

const nome=document.getElementById("nomeCrianca").value
const resp=document.getElementById("responsavelCrianca").value
const cong=document.getElementById("congregacaoCrianca").value
const foto=document.getElementById("fotoCrianca").files[0]

const reader=new FileReader()

reader.onload=function(){

storage.add("criancas",{
id:Date.now(),
nome,
resp,
cong,
foto:reader.result
})

criancas.listar()

}

if(foto)reader.readAsDataURL(foto)

},

listar(){

const lista=storage.get("criancas")
const ul=document.getElementById("listaCriancas")

ul.innerHTML=""

lista.forEach(c=>{

const li=document.createElement("li")

li.innerHTML=`
<img src="${c.foto}" height="40">
${c.nome} - Resp: ${c.resp}
`

ul.appendChild(li)

})

}

}
