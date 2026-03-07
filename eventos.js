
const eventos={

salvar(){

const titulo=document.getElementById("tituloEvento").value
const data=document.getElementById("dataEvento").value
const desc=document.getElementById("descEvento").value

storage.add("eventos",{
id:Date.now(),
titulo,
data,
desc
})

eventos.listar()

},

listar(){

const lista=storage.get("eventos")

const ul=document.getElementById("listaEventos")
ul.innerHTML=""

lista.forEach(e=>{

const li=document.createElement("li")

li.innerHTML=`
<b>${e.titulo}</b> - ${e.data}<br>
${e.desc}
`

ul.appendChild(li)

})

}

}
