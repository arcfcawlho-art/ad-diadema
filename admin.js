
const admin={

promover(){

const nome=document.getElementById("adminNome").value

let usuariosLista=storage.get("usuarios")

usuariosLista=usuariosLista.map(u=>{

if(u.nome===nome){
u.admin=true
}

return u

})

storage.set("usuarios",usuariosLista)

alert("Usuário promovido")

},

exportar(){

const data={
usuarios:storage.get("usuarios"),
membros:storage.get("membros"),
criancas:storage.get("criancas"),
eventos:storage.get("eventos")
}

const blob=new Blob([JSON.stringify(data)],{type:"application/json"})

const a=document.createElement("a")
a.href=URL.createObjectURL(blob)
a.download="backup_igreja.json"
a.click()

},

importar(){

const input=document.createElement("input")
input.type="file"

input.onchange=e=>{

const file=e.target.files[0]
const reader=new FileReader()

reader.onload=function(){

const data=JSON.parse(reader.result)

Object.keys(data).forEach(k=>{
storage.set(k,data[k])
})

alert("Backup restaurado")

}

reader.readAsText(file)

}

input.click()

}

}
