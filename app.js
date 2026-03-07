
const ui={

show(id){

document.querySelectorAll("main section").forEach(s=>{
s.classList.add("hidden")
})

document.getElementById(id).classList.remove("hidden")

if(id==="membros")usuarios.listar()
if(id==="criancas")criancas.listar()
if(id==="eventos")eventos.listar()

}

}

window.onload=function(){

if(!storage.get("usuarios").length){

storage.set("usuarios",[{
nome:"admin",
pin:"1234",
admin:true
}])

}

}
