
const storage={

get(key){
return JSON.parse(localStorage.getItem(key)||"[]")
},

set(key,data){
localStorage.setItem(key,JSON.stringify(data))
},

add(key,obj){
const arr=this.get(key)
arr.push(obj)
this.set(key,arr)
},

remove(key,id){
let arr=this.get(key)
arr=arr.filter(i=>i.id!==id)
this.set(key,arr)
}

}
